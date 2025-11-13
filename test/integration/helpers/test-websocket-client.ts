/**
 * Test WebSocket Client
 * Handles WebSocket connections for agent communication with message filtering and state tracking
 */

import { WebSocket } from 'ws';

interface WebSocketMessage {
	type: string;
	[key: string]: unknown;
}

interface CodeGenState {
	blueprint?: unknown;
	projectName?: string;
	query?: string;
	templateName?: string;
	generatedFilesMap?: Record<string, FileState>;
	generatedPhases?: PhaseState[];
	currentPhase?: string;
	currentDevState?: CurrentDevState;
	mvpGenerated?: boolean;
	sandboxInstanceId?: string;
	conversationMessages?: unknown[];
	[key: string]: unknown;
}

interface FileState {
	filePath: string;
	fileContents: string;
	filePurpose: string;
	lastDiff?: string;
	language?: string;
	needsFixing?: boolean;
	hasErrors?: boolean;
	isGenerating?: boolean;
}

interface PhaseState {
	name: string;
	completed: boolean;
	files?: string[];
	[key: string]: unknown;
}

type CurrentDevState = 'IDLE' | 'PHASE_GENERATING' | 'PHASE_IMPLEMENTING' | 'REVIEWING';

export class TestWebSocketClient {
	private ws: WebSocket | null = null;
	private messages: WebSocketMessage[] = [];
	private latestState: CodeGenState | null = null;
	private connected: boolean = false;
	private verbose: boolean;
	private messageHandlers: Array<(msg: WebSocketMessage) => void> = [];

	constructor(verbose: boolean = false) {
		this.verbose = verbose;
	}

	private log(message: string, data?: unknown): void {
		if (this.verbose) {
			console.log(`[TestWebSocketClient] ${message}`, data || '');
		}
	}

	/**
	 * Connect to WebSocket URL
	 */
	async connect(url: string, sessionCookie: string, timeout: number = 10000): Promise<void> {
		this.log('Connecting to WebSocket...', { url });

		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error(`WebSocket connection timeout after ${timeout}ms`));
			}, timeout);

			this.ws = new WebSocket(url, {
				headers: {
					'Cookie': `session=${sessionCookie}`,
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					'Origin': 'https://onaria.xyz',
				},
			});

			this.ws.on('open', () => {
				clearTimeout(timeoutId);
				this.connected = true;
				this.log('WebSocket connected');
				resolve();
			});

			this.ws.on('message', (data: Buffer) => {
				try {
					const text = data.toString('utf-8');
					const message = JSON.parse(text) as WebSocketMessage;

					this.messages.push(message);
					this.log(`Received: ${message.type}`);

					// Update state if present
					if (message.type === 'agent_connected' && message.state) {
						this.latestState = message.state as CodeGenState;
						this.log('Initial state received');
					} else if (message.type === 'cf_agent_state' && message.state) {
						this.latestState = message.state as CodeGenState;
						this.log('State updated');
					}

					// Notify handlers
					for (const handler of this.messageHandlers) {
						handler(message);
					}
				} catch (error) {
					this.log('Error parsing WebSocket message', { error, data: data.toString() });
				}
			});

			this.ws.on('error', (error) => {
				clearTimeout(timeoutId);
				this.log('WebSocket error', { error });
				reject(error);
			});

			this.ws.on('close', () => {
				this.connected = false;
				this.log('WebSocket closed');
			});
		});
	}

	/**
	 * Register message handler
	 */
	onMessage(handler: (msg: WebSocketMessage) => void): void {
		this.messageHandlers.push(handler);
	}

	/**
	 * Wait for specific message type
	 */
	async waitForMessage(
		type: string,
		timeout: number = 60000,
		predicate?: (msg: WebSocketMessage) => boolean
	): Promise<WebSocketMessage> {
		this.log(`Waiting for message: ${type}`, { timeout });

		// Check existing messages first
		const existing = this.messages.find(
			msg => msg.type === type && (!predicate || predicate(msg))
		);

		if (existing) {
			this.log(`Found existing message: ${type}`);
			return existing;
		}

		// Wait for new message
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error(`Timeout waiting for message: ${type} after ${timeout}ms`));
			}, timeout);

			const handler = (msg: WebSocketMessage) => {
				if (msg.type === type && (!predicate || predicate(msg))) {
					clearTimeout(timeoutId);
					this.log(`Received awaited message: ${type}`);
					this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
					resolve(msg);
				}
			};

			this.messageHandlers.push(handler);
		});
	}

	/**
	 * Wait for multiple message types (first match)
	 */
	async waitForAnyMessage(
		types: string[],
		timeout: number = 60000
	): Promise<WebSocketMessage> {
		this.log(`Waiting for any of: ${types.join(', ')}`, { timeout });

		// Check existing messages first
		const existing = this.messages.find(msg => types.includes(msg.type));
		if (existing) {
			this.log(`Found existing message: ${existing.type}`);
			return existing;
		}

		// Wait for new message
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error(`Timeout waiting for messages: ${types.join(', ')} after ${timeout}ms`));
			}, timeout);

			const handler = (msg: WebSocketMessage) => {
				if (types.includes(msg.type)) {
					clearTimeout(timeoutId);
					this.log(`Received awaited message: ${msg.type}`);
					this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
					resolve(msg);
				}
			};

			this.messageHandlers.push(handler);
		});
	}

	/**
	 * Wait for state to match predicate
	 */
	async waitForState(
		predicate: (state: CodeGenState) => boolean,
		timeout: number = 60000,
		checkInterval: number = 500
	): Promise<CodeGenState> {
		this.log('Waiting for state condition...', { timeout });

		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			if (this.latestState && predicate(this.latestState)) {
				this.log('State condition met');
				return this.latestState;
			}

			await new Promise(resolve => setTimeout(resolve, checkInterval));
		}

		throw new Error(`Timeout waiting for state condition after ${timeout}ms`);
	}

	/**
	 * Collect messages for a duration
	 */
	async collectMessages(duration: number): Promise<WebSocketMessage[]> {
		this.log(`Collecting messages for ${duration}ms...`);

		const startCount = this.messages.length;

		await new Promise(resolve => setTimeout(resolve, duration));

		const newMessages = this.messages.slice(startCount);
		this.log(`Collected ${newMessages.length} new messages`);

		return newMessages;
	}

	/**
	 * Get messages by type
	 */
	getMessagesByType(type: string): WebSocketMessage[] {
		return this.messages.filter(msg => msg.type === type);
	}

	/**
	 * Get all messages
	 */
	getAllMessages(): WebSocketMessage[] {
		return [...this.messages];
	}

	/**
	 * Get latest state
	 */
	getLatestState(): CodeGenState | null {
		return this.latestState;
	}

	/**
	 * Send message to WebSocket
	 */
	async sendMessage(message: WebSocketMessage): Promise<void> {
		if (!this.ws || !this.connected) {
			throw new Error('WebSocket not connected');
		}

		this.log(`Sending message: ${message.type}`);

		return new Promise((resolve, reject) => {
			this.ws!.send(JSON.stringify(message), (error) => {
				if (error) {
					this.log('Error sending message', { error });
					reject(error);
				} else {
					this.log('Message sent successfully');
					resolve();
				}
			});
		});
	}

	/**
	 * Wait for generation to complete
	 */
	async waitForGenerationComplete(timeout: number = 600000): Promise<WebSocketMessage> {
		this.log('Waiting for generation to complete...', { timeout });

		// Wait for generation_complete or error
		return this.waitForAnyMessage(
			['generation_complete', 'error', 'rate_limit_error'],
			timeout
		);
	}

	/**
	 * Wait for deployment to complete
	 */
	async waitForDeploymentComplete(timeout: number = 120000): Promise<WebSocketMessage> {
		this.log('Waiting for deployment to complete...', { timeout });

		// Wait for deployment_completed or deployment_failed
		return this.waitForAnyMessage(
			['deployment_completed', 'deployment_failed', 'error'],
			timeout
		);
	}

	/**
	 * Check if connected
	 */
	isConnected(): boolean {
		return this.connected;
	}

	/**
	 * Get connection status
	 */
	getStatus(): {
		connected: boolean;
		messageCount: number;
		hasState: boolean;
	} {
		return {
			connected: this.connected,
			messageCount: this.messages.length,
			hasState: this.latestState !== null,
		};
	}

	/**
	 * Clear message history (keep state)
	 */
	clearMessages(): void {
		this.log('Clearing message history');
		this.messages = [];
	}

	/**
	 * Close WebSocket connection
	 */
	async close(): Promise<void> {
		this.log('Closing WebSocket connection...');

		if (this.ws && this.connected) {
			return new Promise((resolve) => {
				this.ws!.once('close', () => {
					this.connected = false;
					this.log('WebSocket closed');
					resolve();
				});

				this.ws!.close();

				// Force close after timeout
				setTimeout(() => {
					if (this.ws && this.connected) {
						this.ws.terminate();
						this.connected = false;
						resolve();
					}
				}, 5000);
			});
		}

		this.connected = false;
	}
}
