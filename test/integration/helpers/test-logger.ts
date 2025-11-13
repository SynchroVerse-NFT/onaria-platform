/**
 * Test Logger
 * Structured logging for test runs with detailed request/response tracking
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface LogEntry {
	timestamp: string;
	level: 'info' | 'warn' | 'error' | 'debug';
	category: string;
	message: string;
	data?: unknown;
}

interface RequestLog {
	method: string;
	url: string;
	headers?: Record<string, string>;
	body?: unknown;
	response?: {
		status: number;
		headers?: Record<string, string>;
		body?: unknown;
	};
	duration?: number;
	error?: string;
}

interface WebSocketLog {
	type: string;
	direction: 'sent' | 'received';
	message: unknown;
	timestamp: string;
}

export class TestLogger {
	private logs: LogEntry[] = [];
	private requestLogs: RequestLog[] = [];
	private websocketLogs: WebSocketLog[] = [];
	private testName: string;
	private startTime: number;
	private outputDir: string;

	constructor(testName: string, outputDir: string = 'test-logs') {
		this.testName = testName;
		this.outputDir = outputDir;
		this.startTime = Date.now();

		// Ensure output directory exists
		if (!existsSync(this.outputDir)) {
			mkdirSync(this.outputDir, { recursive: true });
		}

		this.info('Test started', { testName });
	}

	private formatTimestamp(): string {
		return new Date().toISOString();
	}

	private addLog(level: LogEntry['level'], category: string, message: string, data?: unknown): void {
		const entry: LogEntry = {
			timestamp: this.formatTimestamp(),
			level,
			category,
			message,
			data,
		};

		this.logs.push(entry);

		// Also log to console in verbose mode
		if (process.env.VERBOSE === 'true') {
			const prefix = `[${entry.level.toUpperCase()}] [${category}]`;
			if (data) {
				console.log(prefix, message, data);
			} else {
				console.log(prefix, message);
			}
		}
	}

	info(message: string, data?: unknown): void {
		this.addLog('info', 'general', message, data);
	}

	warn(message: string, data?: unknown): void {
		this.addLog('warn', 'general', message, data);
	}

	error(message: string, data?: unknown): void {
		this.addLog('error', 'general', message, data);
	}

	debug(message: string, data?: unknown): void {
		this.addLog('debug', 'general', message, data);
	}

	logRequest(request: RequestLog): void {
		this.requestLogs.push(request);
		this.addLog('info', 'http', `${request.method} ${request.url}`, {
			status: request.response?.status,
			duration: request.duration,
		});
	}

	logWebSocketMessage(type: string, direction: 'sent' | 'received', message: unknown): void {
		const log: WebSocketLog = {
			type,
			direction,
			message,
			timestamp: this.formatTimestamp(),
		};

		this.websocketLogs.push(log);
		this.addLog('debug', 'websocket', `${direction}: ${type}`);
	}

	logStage(stage: string, status: 'started' | 'completed' | 'failed', details?: unknown): void {
		const level = status === 'failed' ? 'error' : 'info';
		this.addLog(level, 'stage', `${stage} ${status}`, details);
	}

	logAssertion(assertion: string, passed: boolean, details?: unknown): void {
		const level = passed ? 'info' : 'error';
		this.addLog(level, 'assertion', `${assertion}: ${passed ? 'PASS' : 'FAIL'}`, details);
	}

	/**
	 * Save logs to file
	 */
	saveLogs(filename?: string): string {
		const testDuration = Date.now() - this.startTime;
		const safeTestName = this.testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const logFilename = filename || `${safeTestName}-${timestamp}.json`;
		const filepath = join(this.outputDir, logFilename);

		const logData = {
			testName: this.testName,
			startTime: new Date(this.startTime).toISOString(),
			duration: testDuration,
			logs: this.logs,
			requests: this.requestLogs,
			websocket: this.websocketLogs,
			summary: {
				totalLogs: this.logs.length,
				errorCount: this.logs.filter(l => l.level === 'error').length,
				warnCount: this.logs.filter(l => l.level === 'warn').length,
				requestCount: this.requestLogs.length,
				websocketMessageCount: this.websocketLogs.length,
			},
		};

		writeFileSync(filepath, JSON.stringify(logData, null, 2), 'utf-8');
		console.log(`Test logs saved to: ${filepath}`);

		return filepath;
	}

	/**
	 * Save failure report with detailed information
	 */
	saveFailureReport(error: Error, context?: unknown): string {
		const safeTestName = this.testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = `FAILURE-${safeTestName}-${timestamp}.json`;
		const filepath = join(this.outputDir, filename);

		const failureData = {
			testName: this.testName,
			timestamp: this.formatTimestamp(),
			error: {
				name: error.name,
				message: error.message,
				stack: error.stack,
			},
			context,
			lastLogs: this.logs.slice(-50), // Last 50 log entries
			lastRequests: this.requestLogs.slice(-10), // Last 10 requests
			lastWebSocketMessages: this.websocketLogs.slice(-50), // Last 50 WS messages
		};

		writeFileSync(filepath, JSON.stringify(failureData, null, 2), 'utf-8');
		console.error(`Failure report saved to: ${filepath}`);

		return filepath;
	}

	/**
	 * Get summary statistics
	 */
	getSummary(): {
		duration: number;
		logCount: number;
		errorCount: number;
		warnCount: number;
		requestCount: number;
		websocketMessageCount: number;
	} {
		return {
			duration: Date.now() - this.startTime,
			logCount: this.logs.length,
			errorCount: this.logs.filter(l => l.level === 'error').length,
			warnCount: this.logs.filter(l => l.level === 'warn').length,
			requestCount: this.requestLogs.length,
			websocketMessageCount: this.websocketLogs.length,
		};
	}

	/**
	 * Print summary to console
	 */
	printSummary(): void {
		const summary = this.getSummary();
		const durationSec = (summary.duration / 1000).toFixed(2);

		console.log('\n=== Test Summary ===');
		console.log(`Test: ${this.testName}`);
		console.log(`Duration: ${durationSec}s`);
		console.log(`Logs: ${summary.logCount} (${summary.errorCount} errors, ${summary.warnCount} warnings)`);
		console.log(`HTTP Requests: ${summary.requestCount}`);
		console.log(`WebSocket Messages: ${summary.websocketMessageCount}`);
		console.log('====================\n');
	}
}
