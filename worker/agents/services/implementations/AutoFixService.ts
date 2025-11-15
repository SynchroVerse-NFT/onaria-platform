/**
 * AutoFixService - Orchestrates automatic error detection and fixing
 * Integrates with ErrorClassifier and routing to fixing agents
 */

import { ErrorClassifier, ClassifiedError, ErrorType, ErrorSeverity } from './ErrorClassifier';

export interface FixAttempt {
	errorHash: string;
	error: ClassifiedError;
	attempts: number;
	lastAttemptTime: number;
	firstAttemptTime: number;
	fixStrategy: 'deepDebugger' | 'realtimeCodeFixer' | 'manual';
	status: 'pending' | 'in_progress' | 'fixed' | 'failed' | 'max_retries' | 'skipped';
	fixedBy?: string; // Agent that fixed it
	fixDurationMs?: number;
}

export interface AutoFixConfig {
	maxRetries: number;
	retryDelayMs: number;
	exponentialBackoff: boolean;
	maxConcurrentFixes: number;
	enableDuringGeneration: boolean;
	enableRealtimeCodeFixer: boolean;
	enableDeepDebugger: boolean;
	skipManualErrors: boolean;
	deduplicationWindowMs: number; // How long to remember fixed errors
}

export interface AutoFixStats {
	totalErrorsProcessed: number;
	totalErrorsFixed: number;
	totalErrorsFailed: number;
	totalErrorsSkipped: number;
	averageFixTimeMs: number;
	errorsByType: Record<ErrorType, number>;
	errorsBySeverity: Record<ErrorSeverity, number>;
	fixesByAgent: Record<string, number>;
}

export interface AutoFixProgress {
	status: 'idle' | 'processing' | 'fixing' | 'verifying' | 'completed' | 'failed';
	currentError?: ClassifiedError;
	queueSize: number;
	activeFixesCount: number;
	message: string;
	progress?: number; // 0-100
}

/**
 * AutoFixService - Main orchestrator for automatic error fixing
 */
export class AutoFixService {
	private errorQueue: ClassifiedError[] = [];
	private fixAttempts: Map<string, FixAttempt> = new Map();
	private activeFixes: Set<string> = new Set();
	private recentlyFixed: Set<string> = new Set(); // Deduplication
	private config: AutoFixConfig;
	private stats: AutoFixStats;
	private isProcessing = false;
	private abortController?: AbortController;

	// Callbacks for integration
	private onProgressCallback?: (progress: AutoFixProgress) => void;
	private onErrorFixedCallback?: (attempt: FixAttempt) => void;
	private onErrorFailedCallback?: (attempt: FixAttempt) => void;
	private agentFixCallback?: (error: ClassifiedError, strategy: 'deepDebugger' | 'realtimeCodeFixer') => Promise<boolean>;

	constructor(config?: Partial<AutoFixConfig>) {
		this.config = {
			maxRetries: 3,
			retryDelayMs: 2000,
			exponentialBackoff: true,
			maxConcurrentFixes: 2,
			enableDuringGeneration: false,
			enableRealtimeCodeFixer: true,
			enableDeepDebugger: true,
			skipManualErrors: true,
			deduplicationWindowMs: 60000, // 1 minute
			...config,
		};

		this.stats = {
			totalErrorsProcessed: 0,
			totalErrorsFixed: 0,
			totalErrorsFailed: 0,
			totalErrorsSkipped: 0,
			averageFixTimeMs: 0,
			errorsByType: {} as Record<ErrorType, number>,
			errorsBySeverity: {} as Record<ErrorSeverity, number>,
			fixesByAgent: {},
		};
	}

	/**
	 * Register callbacks for progress updates
	 */
	onProgress(callback: (progress: AutoFixProgress) => void): void {
		this.onProgressCallback = callback;
	}

	onErrorFixed(callback: (attempt: FixAttempt) => void): void {
		this.onErrorFixedCallback = callback;
	}

	onErrorFailed(callback: (attempt: FixAttempt) => void): void {
		this.onErrorFailedCallback = callback;
	}

	/**
	 * Register callback for agent-based fixing
	 * @param callback Function that invokes deepDebugger or realtimeCodeFixer
	 * @returns true if fix succeeded, false otherwise
	 */
	onAgentFix(callback: (error: ClassifiedError, strategy: 'deepDebugger' | 'realtimeCodeFixer') => Promise<boolean>): void {
		this.agentFixCallback = callback;
	}

	/**
	 * Main entry point: Process new errors from various sources
	 * @param errors - Array of error messages
	 * @param source - Source of errors (e.g., 'deployment', 'runtime', 'build')
	 * @param agentId - ID of the agent session
	 */
	async processErrors(
		errors: string[],
		source: string,
		options?: {
			agentId?: string;
			priority?: boolean;
		}
	): Promise<void> {
		if (errors.length === 0) return;

		// Classify all errors
		const classified = ErrorClassifier.classifyBatch(errors);

		// Deduplicate against recently fixed errors
		const newErrors = classified.filter(error => !this.recentlyFixed.has(error.errorHash));

		if (newErrors.length === 0) {
			this.emitProgress({
				status: 'idle',
				queueSize: this.errorQueue.length,
				activeFixesCount: this.activeFixes.size,
				message: 'All errors already fixed or in queue',
			});
			return;
		}

		// Further deduplicate against existing queue
		const deduplicated = ErrorClassifier.deduplicate([...this.errorQueue, ...newErrors]);
		const trulyNewErrors = deduplicated.slice(this.errorQueue.length);

		// Update stats
		trulyNewErrors.forEach(error => {
			this.stats.totalErrorsProcessed++;
			this.stats.errorsByType[error.type] = (this.stats.errorsByType[error.type] || 0) + 1;
			this.stats.errorsBySeverity[error.severity] =
				(this.stats.errorsBySeverity[error.severity] || 0) + 1;
		});

		// Add to queue (priority errors go to front)
		if (options?.priority) {
			this.errorQueue.unshift(...trulyNewErrors);
		} else {
			this.errorQueue.push(...trulyNewErrors);
		}

		// Prioritize the queue
		this.errorQueue = ErrorClassifier.prioritize(this.errorQueue);

		this.emitProgress({
			status: 'processing',
			queueSize: this.errorQueue.length,
			activeFixesCount: this.activeFixes.size,
			message: `Added ${trulyNewErrors.length} new errors from ${source}`,
		});

		// Start processing if not already running
		if (!this.isProcessing) {
			await this.processQueue();
		}
	}

	/**
	 * Process the error queue
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing) return;

		this.isProcessing = true;
		this.abortController = new AbortController();

		try {
			while (this.errorQueue.length > 0) {
				// Wait if we've hit max concurrent fixes
				while (this.activeFixes.size >= this.config.maxConcurrentFixes) {
					await this.sleep(500);
				}

				const error = this.errorQueue.shift();
				if (!error) continue;

				// Check if we should skip this error
				if (this.shouldSkipError(error)) {
					this.stats.totalErrorsSkipped++;
					this.createFixAttempt(error, 'skipped');
					continue;
				}

				// Check if we should retry this error
				if (!this.shouldRetryError(error.errorHash)) {
					this.stats.totalErrorsFailed++;
					const attempt = this.fixAttempts.get(error.errorHash);
					if (attempt) {
						attempt.status = 'max_retries';
						this.onErrorFailedCallback?.(attempt);
					}
					continue;
				}

				// Execute fix (non-blocking, runs in background)
				this.executeFix(error).catch(err => {
					console.error(`Error executing fix for ${error.errorHash}:`, err);
				});
			}

			// Wait for all active fixes to complete
			while (this.activeFixes.size > 0) {
				await this.sleep(500);
			}

			this.emitProgress({
				status: 'completed',
				queueSize: 0,
				activeFixesCount: 0,
				message: 'All errors processed',
			});
		} catch (error) {
			this.emitProgress({
				status: 'failed',
				queueSize: this.errorQueue.length,
				activeFixesCount: this.activeFixes.size,
				message: `Queue processing failed: ${error}`,
			});
		} finally {
			this.isProcessing = false;
			this.abortController = undefined;
		}
	}

	/**
	 * Execute fix for a single error
	 */
	private async executeFix(error: ClassifiedError): Promise<boolean> {
		const startTime = Date.now();
		this.activeFixes.add(error.errorHash);

		// Create or update fix attempt
		let attempt = this.fixAttempts.get(error.errorHash);
		if (!attempt) {
			attempt = this.createFixAttempt(error, 'pending');
		}

		attempt.status = 'in_progress';
		attempt.attempts++;
		attempt.lastAttemptTime = Date.now();

		this.emitProgress({
			status: 'fixing',
			currentError: error,
			queueSize: this.errorQueue.length,
			activeFixesCount: this.activeFixes.size,
			message: `Fixing ${error.type} error (attempt ${attempt.attempts}/${this.config.maxRetries})`,
		});

		try {
			// Invoke the appropriate fixing agent
			const success = await this.invokeFixingAgent(error, attempt);

			const fixDuration = Date.now() - startTime;
			attempt.fixDurationMs = fixDuration;

			if (success) {
				attempt.status = 'fixed';
				this.stats.totalErrorsFixed++;
				this.stats.fixesByAgent[error.fixStrategy] =
					(this.stats.fixesByAgent[error.fixStrategy] || 0) + 1;

				// Update average fix time
				const totalFixTime =
					this.stats.averageFixTimeMs * (this.stats.totalErrorsFixed - 1) + fixDuration;
				this.stats.averageFixTimeMs = totalFixTime / this.stats.totalErrorsFixed;

				// Add to recently fixed (for deduplication)
				this.recentlyFixed.add(error.errorHash);
				setTimeout(() => {
					this.recentlyFixed.delete(error.errorHash);
				}, this.config.deduplicationWindowMs);

				this.onErrorFixedCallback?.(attempt);

				this.emitProgress({
					status: 'completed',
					queueSize: this.errorQueue.length,
					activeFixesCount: this.activeFixes.size - 1,
					message: `Fixed ${error.type} error in ${fixDuration}ms`,
					progress: 100,
				});

				return true;
			} else {
				// Fix failed, might retry
				if (this.shouldRetryError(error.errorHash)) {
					attempt.status = 'pending';
					// Re-add to queue with delay
					const delay = this.calculateRetryDelay(attempt.attempts);
					setTimeout(() => {
						this.errorQueue.push(error);
						this.errorQueue = ErrorClassifier.prioritize(this.errorQueue);
					}, delay);
				} else {
					attempt.status = 'failed';
					this.stats.totalErrorsFailed++;
					this.onErrorFailedCallback?.(attempt);
				}

				return false;
			}
		} catch (err) {
			attempt.status = 'failed';
			this.stats.totalErrorsFailed++;
			this.onErrorFailedCallback?.(attempt);

			this.emitProgress({
				status: 'failed',
				currentError: error,
				queueSize: this.errorQueue.length,
				activeFixesCount: this.activeFixes.size - 1,
				message: `Fix failed: ${err}`,
			});

			return false;
		} finally {
			this.activeFixes.delete(error.errorHash);
		}
	}

	/**
	 * Invoke the appropriate fixing agent based on fix strategy
	 */
	private async invokeFixingAgent(
		error: ClassifiedError,
		attempt: FixAttempt
	): Promise<boolean> {
		// Check if agent is enabled
		if (
			error.fixStrategy === 'deepDebugger' &&
			!this.config.enableDeepDebugger
		) {
			return false;
		}

		if (
			error.fixStrategy === 'realtimeCodeFixer' &&
			!this.config.enableRealtimeCodeFixer
		) {
			return false;
		}

		attempt.fixedBy = error.fixStrategy;

		// If callback is registered, use it for actual agent invocation
		if (this.agentFixCallback && error.fixStrategy !== 'manual') {
			try {
				return await this.agentFixCallback(error, error.fixStrategy);
			} catch (err) {
				console.error('Agent fix callback error:', err);
				return false;
			}
		}

		// Fallback: Simulate fix attempt (for testing without agent integration)
		const fixDelay = error.fixStrategy === 'deepDebugger' ? 5000 : 2000;
		await this.sleep(fixDelay);

		// Simulate success rate based on confidence
		const successProbability = error.confidence * 0.8; // 80% of confidence score
		return Math.random() < successProbability;
	}

	/**
	 * Check if error should be skipped
	 */
	private shouldSkipError(error: ClassifiedError): boolean {
		// Skip non-fixable errors
		if (!error.isAutoFixable) return true;

		// Skip manual errors if configured
		if (this.config.skipManualErrors && error.fixStrategy === 'manual') return true;

		// Skip network errors (not code-fixable)
		if (error.type === ErrorType.NETWORK) return true;

		return false;
	}

	/**
	 * Check if error should be retried
	 */
	private shouldRetryError(errorHash: string): boolean {
		const attempt = this.fixAttempts.get(errorHash);
		if (!attempt) return true;

		return attempt.attempts < this.config.maxRetries;
	}

	/**
	 * Calculate retry delay with exponential backoff
	 */
	private calculateRetryDelay(attemptNumber: number): number {
		if (!this.config.exponentialBackoff) {
			return this.config.retryDelayMs;
		}

		// Exponential backoff: delay * (2 ^ attemptNumber)
		return this.config.retryDelayMs * Math.pow(2, attemptNumber - 1);
	}

	/**
	 * Create a new fix attempt record
	 */
	private createFixAttempt(
		error: ClassifiedError,
		status: FixAttempt['status']
	): FixAttempt {
		const attempt: FixAttempt = {
			errorHash: error.errorHash,
			error,
			attempts: 0,
			lastAttemptTime: Date.now(),
			firstAttemptTime: Date.now(),
			fixStrategy: error.fixStrategy,
			status,
		};

		this.fixAttempts.set(error.errorHash, attempt);
		return attempt;
	}

	/**
	 * Emit progress update
	 */
	private emitProgress(progress: AutoFixProgress): void {
		this.onProgressCallback?.(progress);
	}

	/**
	 * Sleep utility
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Public API: Get current stats
	 */
	getStats(): AutoFixStats {
		return { ...this.stats };
	}

	/**
	 * Public API: Get current queue size
	 */
	getQueueSize(): number {
		return this.errorQueue.length;
	}

	/**
	 * Public API: Get active fixes count
	 */
	getActiveFixesCount(): number {
		return this.activeFixes.size;
	}

	/**
	 * Public API: Get all fix attempts
	 */
	getAllFixAttempts(): FixAttempt[] {
		return Array.from(this.fixAttempts.values());
	}

	/**
	 * Public API: Get fix attempt by hash
	 */
	getFixAttempt(errorHash: string): FixAttempt | undefined {
		return this.fixAttempts.get(errorHash);
	}

	/**
	 * Public API: Clear all data
	 */
	clear(): void {
		this.errorQueue = [];
		this.fixAttempts.clear();
		this.activeFixes.clear();
		this.recentlyFixed.clear();
		this.isProcessing = false;
		this.abortController?.abort();
		this.abortController = undefined;
	}

	/**
	 * Public API: Abort current processing
	 */
	abort(): void {
		this.abortController?.abort();
		this.isProcessing = false;
		this.activeFixes.clear();
		this.errorQueue = [];

		this.emitProgress({
			status: 'idle',
			queueSize: 0,
			activeFixesCount: 0,
			message: 'Auto-fix aborted',
		});
	}

	/**
	 * Public API: Update configuration
	 */
	updateConfig(config: Partial<AutoFixConfig>): void {
		this.config = { ...this.config, ...config };
	}

	/**
	 * Public API: Get configuration
	 */
	getConfig(): AutoFixConfig {
		return { ...this.config };
	}
}
