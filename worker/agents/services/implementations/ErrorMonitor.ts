/**
 * ErrorMonitor - Continuously monitors sandbox instances for runtime errors
 * Automatically triggers auto-fix when errors are detected
 */

import { RuntimeError, StaticAnalysisResponse } from '../../../services/sandbox/sandboxTypes';
import { BaseSandboxService } from '../../../services/sandbox/BaseSandboxService';
import { AutoFixService } from './AutoFixService';
import { ErrorClassifier } from './ErrorClassifier';

export interface ErrorMonitorConfig {
	pollInterval: number; // milliseconds
	enableRuntimeErrorMonitoring: boolean;
	enableStaticAnalysisMonitoring: boolean;
	enableConsoleLogMonitoring: boolean;
	autoTriggerFix: boolean;
	debounceWindow: number; // milliseconds to wait before triggering fix
}

export interface ErrorMonitorCallbacks {
	onErrorDetected?: (errors: string[], source: string) => void;
	onMonitoringStarted?: () => void;
	onMonitoringStopped?: () => void;
	onMonitoringError?: (error: Error) => void;
}

/**
 * ErrorMonitor service
 * Polls sandbox instance for errors and triggers auto-fix
 */
export class ErrorMonitor {
	private config: ErrorMonitorConfig;
	private callbacks?: ErrorMonitorCallbacks;
	private pollTimer?: ReturnType<typeof setInterval>;
	private isMonitoring = false;
	private lastErrorHashes = new Set<string>();
	private debounceTimer?: ReturnType<typeof setTimeout>;
	private pendingErrors: string[] = [];
	private sandboxInstanceId?: string;
	private sandboxClient?: BaseSandboxService;
	private autoFixService?: AutoFixService;

	constructor(config?: Partial<ErrorMonitorConfig>) {
		this.config = {
			pollInterval: 5000, // 5 seconds
			enableRuntimeErrorMonitoring: true,
			enableStaticAnalysisMonitoring: false, // Disabled by default (expensive)
			enableConsoleLogMonitoring: false, // Disabled by default (not yet implemented)
			autoTriggerFix: true,
			debounceWindow: 2000, // 2 seconds
			...config,
		};
	}

	/**
	 * Register callbacks for monitoring events
	 */
	setCallbacks(callbacks: ErrorMonitorCallbacks): void {
		this.callbacks = callbacks;
	}

	/**
	 * Set the sandbox client to use for monitoring
	 */
	setSandboxClient(client: BaseSandboxService, instanceId: string): void {
		this.sandboxClient = client;
		this.sandboxInstanceId = instanceId;
	}

	/**
	 * Set the AutoFixService to trigger when errors are detected
	 */
	setAutoFixService(service: AutoFixService): void {
		this.autoFixService = service;
	}

	/**
	 * Start monitoring for errors
	 */
	start(): void {
		if (this.isMonitoring) {
			console.warn('ErrorMonitor already running');
			return;
		}

		if (!this.sandboxClient || !this.sandboxInstanceId) {
			throw new Error('Sandbox client and instance ID must be set before starting monitor');
		}

		this.isMonitoring = true;
		this.lastErrorHashes.clear();
		this.pendingErrors = [];

		this.callbacks?.onMonitoringStarted?.();

		// Start polling
		this.pollTimer = setInterval(() => {
			this.poll().catch(error => {
				console.error('Error during monitoring poll:', error);
				this.callbacks?.onMonitoringError?.(error);
			});
		}, this.config.pollInterval);

		// Initial poll
		this.poll().catch(error => {
			console.error('Error during initial poll:', error);
			this.callbacks?.onMonitoringError?.(error);
		});
	}

	/**
	 * Stop monitoring for errors
	 */
	stop(): void {
		if (!this.isMonitoring) {
			return;
		}

		this.isMonitoring = false;

		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = undefined;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}

		this.callbacks?.onMonitoringStopped?.();
	}

	/**
	 * Poll sandbox for errors
	 */
	private async poll(): Promise<void> {
		if (!this.isMonitoring || !this.sandboxClient || !this.sandboxInstanceId) {
			return;
		}

		const errors: string[] = [];

		// Monitor runtime errors
		if (this.config.enableRuntimeErrorMonitoring) {
			const runtimeErrors = await this.checkRuntimeErrors();
			errors.push(...runtimeErrors);
		}

		// Monitor static analysis errors (expensive, off by default)
		if (this.config.enableStaticAnalysisMonitoring) {
			const staticErrors = await this.checkStaticAnalysis();
			errors.push(...staticErrors);
		}

		// Monitor console logs (not yet implemented)
		if (this.config.enableConsoleLogMonitoring) {
			const consoleErrors = await this.checkConsoleLogs();
			errors.push(...consoleErrors);
		}

		// Filter out errors we've already seen
		const newErrors = this.filterNewErrors(errors);

		if (newErrors.length > 0) {
			this.callbacks?.onErrorDetected?.(newErrors, 'runtime_monitoring');

			// Add to pending errors
			this.pendingErrors.push(...newErrors);

			// Debounce auto-fix trigger
			if (this.config.autoTriggerFix) {
				this.debouncedTriggerAutoFix();
			}
		}
	}

	/**
	 * Check for runtime errors
	 */
	private async checkRuntimeErrors(): Promise<string[]> {
		if (!this.sandboxClient || !this.sandboxInstanceId) {
			return [];
		}

		try {
			const response = await this.sandboxClient.getInstanceErrors(
				this.sandboxInstanceId,
				false // Don't clear errors
			);

			if (!response || !response.success || !response.errors) {
				return [];
			}

			// Filter out WebSocket connection errors
			const validErrors = response.errors.filter(
				error => !error.message.includes('[vite] failed to connect to websocket')
			);

			return validErrors.map(error => this.formatRuntimeError(error));
		} catch (error) {
			console.error('Failed to check runtime errors:', error);
			return [];
		}
	}

	/**
	 * Check for static analysis errors
	 */
	private async checkStaticAnalysis(): Promise<string[]> {
		if (!this.sandboxClient || !this.sandboxInstanceId) {
			return [];
		}

		try {
			const response = await this.sandboxClient.runStaticAnalysisCode(
				this.sandboxInstanceId,
				[] // Empty array = analyze all files
			);

			if (!response || response.error) {
				return [];
			}

			const errors: string[] = [];

			// Extract lint errors
			if (response.lint?.issues) {
				response.lint.issues
					.filter(issue => issue.severity === 'error')
					.forEach(issue => {
						errors.push(this.formatStaticAnalysisError(issue, 'lint'));
					});
			}

			// Extract type errors
			if (response.typecheck?.issues) {
				response.typecheck.issues
					.filter(issue => issue.severity === 'error')
					.forEach(issue => {
						errors.push(this.formatStaticAnalysisError(issue, 'typecheck'));
					});
			}

			return errors;
		} catch (error) {
			console.error('Failed to check static analysis:', error);
			return [];
		}
	}

	/**
	 * Check console logs for errors (not yet implemented)
	 */
	private async checkConsoleLogs(): Promise<string[]> {
		// TODO: Implement console log monitoring
		// This would require WebSocket connection to sandbox console output
		return [];
	}

	/**
	 * Format runtime error as string
	 */
	private formatRuntimeError(error: RuntimeError): string {
		let formatted = `[Runtime Error] ${error.message}`;

		if (error.stack) {
			formatted += `\n${error.stack}`;
		}

		if (error.filename) {
			formatted += `\n  at ${error.filename}`;
			if (error.lineno) {
				formatted += `:${error.lineno}`;
				if (error.colno) {
					formatted += `:${error.colno}`;
				}
			}
		}

		return formatted;
	}

	/**
	 * Format static analysis error as string
	 */
	private formatStaticAnalysisError(
		issue: { message: string; filePath?: string; line?: number; column?: number; severity?: string },
		source: 'lint' | 'typecheck'
	): string {
		let formatted = `[${source === 'lint' ? 'Lint' : 'Type'} Error] ${issue.message}`;

		if (issue.filePath) {
			formatted += `\n  at ${issue.filePath}`;
			if (issue.line) {
				formatted += `:${issue.line}`;
				if (issue.column) {
					formatted += `:${issue.column}`;
				}
			}
		}

		return formatted;
	}

	/**
	 * Filter errors to only include new ones
	 */
	private filterNewErrors(errors: string[]): string[] {
		const newErrors: string[] = [];

		for (const error of errors) {
			const classified = ErrorClassifier.classify(error);
			const hash = classified.errorHash;

			if (!this.lastErrorHashes.has(hash)) {
				newErrors.push(error);
				this.lastErrorHashes.add(hash);
			}
		}

		return newErrors;
	}

	/**
	 * Trigger auto-fix with debouncing
	 */
	private debouncedTriggerAutoFix(): void {
		// Clear existing timer
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}

		// Set new timer
		this.debounceTimer = setTimeout(() => {
			this.triggerAutoFix();
		}, this.config.debounceWindow);
	}

	/**
	 * Trigger auto-fix for pending errors
	 */
	private async triggerAutoFix(): Promise<void> {
		if (!this.autoFixService || this.pendingErrors.length === 0) {
			return;
		}

		const errorsToFix = [...this.pendingErrors];
		this.pendingErrors = [];

		try {
			await this.autoFixService.processErrors(errorsToFix, 'error_monitor', {
				priority: true,
			});
		} catch (error) {
			console.error('Failed to trigger auto-fix:', error);
			this.callbacks?.onMonitoringError?.(
				error instanceof Error ? error : new Error(String(error))
			);
		}
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<ErrorMonitorConfig>): void {
		this.config = { ...this.config, ...config };

		// Restart monitoring if interval changed and currently running
		if (config.pollInterval && this.isMonitoring) {
			this.stop();
			this.start();
		}
	}

	/**
	 * Get current configuration
	 */
	getConfig(): ErrorMonitorConfig {
		return { ...this.config };
	}

	/**
	 * Check if monitoring is active
	 */
	isActive(): boolean {
		return this.isMonitoring;
	}

	/**
	 * Clear error history (for testing or reset)
	 */
	clearHistory(): void {
		this.lastErrorHashes.clear();
		this.pendingErrors = [];
	}
}
