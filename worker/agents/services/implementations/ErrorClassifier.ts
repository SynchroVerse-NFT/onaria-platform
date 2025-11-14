/**
 * ErrorClassifier - Classifies errors by type, severity, and fixability
 * Used by AutoFixService to route errors to appropriate fixing strategies
 */

export enum ErrorType {
	RUNTIME = 'runtime',
	BUILD = 'build',
	SYNTAX = 'syntax',
	IMPORT = 'import',
	TYPE_ERROR = 'type_error',
	INFINITE_LOOP = 'infinite_loop',
	NULL_POINTER = 'null_pointer',
	UNDEFINED_ACCESS = 'undefined_access',
	NETWORK = 'network',
	TAILWIND = 'tailwind',
	REACT_HOOK = 'react_hook',
	UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
	CRITICAL = 'critical',  // App crashes, cannot render
	HIGH = 'high',          // Major functionality broken
	MEDIUM = 'medium',      // Minor issues, app partially works
	LOW = 'low',            // Warnings, non-blocking issues
}

export interface ClassifiedError {
	originalError: string;
	type: ErrorType;
	severity: ErrorSeverity;
	isAutoFixable: boolean;
	fixStrategy: 'deepDebugger' | 'realtimeCodeFixer' | 'manual';
	confidence: number; // 0-1, how confident we are in classification
	errorHash: string;  // Unique hash for deduplication
	file?: string;      // Extracted file path if available
	line?: number;      // Extracted line number if available
	stackTrace?: string; // Stack trace if available
}

export class ErrorClassifier {
	private static ERROR_PATTERNS = {
		// React infinite loop patterns
		[ErrorType.INFINITE_LOOP]: [
			/maximum update depth exceeded/i,
			/too many re-renders/i,
			/maximum call stack size exceeded/i,
		],

		// Import/Export errors
		[ErrorType.IMPORT]: [
			/cannot find module/i,
			/module not found/i,
			/failed to resolve import/i,
			/does not provide an export named/i,
			/no such export/i,
		],

		// Syntax errors
		[ErrorType.SYNTAX]: [
			/unexpected token/i,
			/syntax error/i,
			/expected.*got/i,
			/missing.*before/i,
		],

		// TypeScript type errors
		[ErrorType.TYPE_ERROR]: [
			/type '.*' is not assignable to type/i,
			/property '.*' does not exist on type/i,
			/cannot find name/i,
			/type.*has no call signatures/i,
		],

		// Null pointer / undefined access
		[ErrorType.NULL_POINTER]: [
			/cannot read propert.*of null/i,
			/cannot read propert.*of undefined/i,
			/null is not an object/i,
			/undefined is not an object/i,
			/cannot destructure property/i,
		],

		// React Hooks errors
		[ErrorType.REACT_HOOK]: [
			/invalid hook call/i,
			/hooks can only be called inside/i,
			/rendered more hooks than during the previous render/i,
		],

		// Tailwind CSS errors
		[ErrorType.TAILWIND]: [
			/unknown.*tailwind/i,
			/tailwind.*not found/i,
		],

		// Network errors
		[ErrorType.NETWORK]: [
			/network error/i,
			/failed to fetch/i,
			/cors error/i,
		],
	};

	private static SEVERITY_PATTERNS = {
		[ErrorSeverity.CRITICAL]: [
			/cannot read property/i,
			/maximum update depth/i,
			/maximum call stack/i,
			/undefined is not/i,
			/failed to compile/i,
		],
		[ErrorSeverity.HIGH]: [
			/type.*is not assignable/i,
			/does not exist on type/i,
			/cannot find module/i,
		],
		[ErrorSeverity.MEDIUM]: [
			/expected.*got/i,
			/deprecated/i,
		],
		[ErrorSeverity.LOW]: [
			/warning/i,
		],
	};

	/**
	 * Classify an error message
	 */
	static classify(errorMessage: string, source?: string): ClassifiedError {
		const type = this.detectErrorType(errorMessage);
		const severity = this.detectSeverity(errorMessage);
		const fileInfo = this.extractFileInfo(errorMessage);
		const isAutoFixable = this.isFixable(type, severity);
		const fixStrategy = this.determineFix

Strategy(type, severity);
		const errorHash = this.hashError(errorMessage);
		const stackTrace = this.extractStackTrace(errorMessage);

		return {
			originalError: errorMessage,
			type,
			severity,
			isAutoFixable,
			fixStrategy,
			confidence: this.calculateConfidence(type, severity),
			errorHash,
			file: fileInfo.file,
			line: fileInfo.line,
			stackTrace,
		};
	}

	/**
	 * Detect error type from message
	 */
	private static detectErrorType(error: string): ErrorType {
		for (const [type, patterns] of Object.entries(this.ERROR_PATTERNS)) {
			for (const pattern of patterns) {
				if (pattern.test(error)) {
					return type as ErrorType;
				}
			}
		}

		// Fallback detection based on keywords
		if (error.includes('build') || error.includes('compile')) {
			return ErrorType.BUILD;
		}
		if (error.includes('runtime')) {
			return ErrorType.RUNTIME;
		}

		return ErrorType.UNKNOWN;
	}

	/**
	 * Detect error severity
	 */
	private static detectSeverity(error: string): ErrorSeverity {
		for (const [severity, patterns] of Object.entries(this.SEVERITY_PATTERNS)) {
			for (const pattern of patterns) {
				if (pattern.test(error)) {
					return severity as ErrorSeverity;
				}
			}
		}

		// Default severity based on keywords
		if (error.toLowerCase().includes('error')) {
			return ErrorSeverity.HIGH;
		}
		if (error.toLowerCase().includes('warning')) {
			return ErrorSeverity.LOW;
		}

		return ErrorSeverity.MEDIUM;
	}

	/**
	 * Determine if error is auto-fixable
	 */
	private static isFixable(type: ErrorType, severity: ErrorSeverity): boolean {
		// Critical infinite loops are risky to auto-fix
		if (type === ErrorType.INFINITE_LOOP && severity === ErrorSeverity.CRITICAL) {
			return true; // But still try
		}

		// Network errors are not code-fixable
		if (type === ErrorType.NETWORK) {
			return false;
		}

		// Unknown errors are risky
		if (type === ErrorType.UNKNOWN) {
			return false;
		}

		// Most code errors are fixable
		return [
			ErrorType.IMPORT,
			ErrorType.SYNTAX,
			ErrorType.TYPE_ERROR,
			ErrorType.NULL_POINTER,
			ErrorType.UNDEFINED_ACCESS,
			ErrorType.REACT_HOOK,
			ErrorType.TAILWIND,
			ErrorType.RUNTIME,
			ErrorType.BUILD,
		].includes(type);
	}

	/**
	 * Determine which fixing strategy to use
	 */
	private static determineFixStrategy(
		type: ErrorType,
		severity: ErrorSeverity
	): 'deepDebugger' | 'realtimeCodeFixer' | 'manual' {
		// Simple import/syntax errors → fast fixer
		if (
			[ErrorType.IMPORT, ErrorType.SYNTAX, ErrorType.TAILWIND].includes(type) &&
			severity !== ErrorSeverity.CRITICAL
		) {
			return 'realtimeCodeFixer';
		}

		// Complex errors → deep debugger
		if (
			[
				ErrorType.INFINITE_LOOP,
				ErrorType.REACT_HOOK,
				ErrorType.NULL_POINTER,
				ErrorType.UNDEFINED_ACCESS,
			].includes(type)
		) {
			return 'deepDebugger';
		}

		// Runtime/build errors → deep debugger for analysis
		if ([ErrorType.RUNTIME, ErrorType.BUILD, ErrorType.TYPE_ERROR].includes(type)) {
			return 'deepDebugger';
		}

		// Unfixable → manual
		return 'manual';
	}

	/**
	 * Calculate confidence in classification
	 */
	private static calculateConfidence(type: ErrorType, severity: ErrorSeverity): number {
		if (type === ErrorType.UNKNOWN) return 0.3;
		if (severity === ErrorSeverity.CRITICAL) return 0.9;
		if ([ErrorType.IMPORT, ErrorType.SYNTAX].includes(type)) return 0.95;
		return 0.7;
	}

	/**
	 * Create unique hash for error deduplication
	 */
	private static hashError(error: string): string {
		// Simple hash: remove timestamps, line numbers, dynamic values
		const normalized = error
			.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '') // ISO timestamps
			.replace(/line \d+/gi, 'line X')
			.replace(/column \d+/gi, 'column X')
			.replace(/@\d+:\d+/g, '@X:X')
			.replace(/\d+ ms/g, 'X ms')
			.toLowerCase()
			.trim();

		// Very basic hash (in production, use crypto.subtle.digest)
		let hash = 0;
		for (let i = 0; i < normalized.length; i++) {
			const char = normalized.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(16);
	}

	/**
	 * Extract file path and line number from error
	 */
	private static extractFileInfo(error: string): { file?: string; line?: number } {
		// Pattern: /path/to/file.ts:123:45
		const fileMatch = error.match(/([a-zA-Z0-9_\-./]+\.[jt]sx?):(\d+)/);
		if (fileMatch) {
			return {
				file: fileMatch[1],
				line: parseInt(fileMatch[2], 10),
			};
		}

		// Pattern: at /path/to/file.ts (123:45)
		const atMatch = error.match(/at\s+([a-zA-Z0-9_\-./]+\.[jt]sx?)\s+\((\d+):/);
		if (atMatch) {
			return {
				file: atMatch[1],
				line: parseInt(atMatch[2], 10),
			};
		}

		return {};
	}

	/**
	 * Extract stack trace from error
	 */
	private static extractStackTrace(error: string): string | undefined {
		// Look for stack trace pattern
		const stackMatch = error.match(/(at\s+.+\n?)+/);
		return stackMatch ? stackMatch[0] : undefined;
	}

	/**
	 * Batch classify multiple errors
	 */
	static classifyBatch(errors: string[]): ClassifiedError[] {
		return errors.map(error => this.classify(error));
	}

	/**
	 * Filter out duplicate errors based on hash
	 */
	static deduplicate(errors: ClassifiedError[]): ClassifiedError[] {
		const seen = new Set<string>();
		return errors.filter(error => {
			if (seen.has(error.errorHash)) {
				return false;
			}
			seen.add(error.errorHash);
			return true;
		});
	}

	/**
	 * Sort errors by priority (severity + fixability)
	 */
	static prioritize(errors: ClassifiedError[]): ClassifiedError[] {
		const severityWeight = {
			[ErrorSeverity.CRITICAL]: 4,
			[ErrorSeverity.HIGH]: 3,
			[ErrorSeverity.MEDIUM]: 2,
			[ErrorSeverity.LOW]: 1,
		};

		return [...errors].sort((a, b) => {
			// Auto-fixable errors first
			if (a.isAutoFixable !== b.isAutoFixable) {
				return a.isAutoFixable ? -1 : 1;
			}

			// Then by severity
			const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
			if (severityDiff !== 0) {
				return severityDiff;
			}

			// Finally by confidence
			return b.confidence - a.confidence;
		});
	}
}
