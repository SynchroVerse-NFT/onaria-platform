/**
 * Integration Test: WebSocket Flow
 * Tests WebSocket connection, message handling, and state tracking
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestApiClient, RateLimitError } from './helpers/test-api-client';
import { TestWebSocketClient } from './helpers/test-websocket-client';
import { TestLogger } from './helpers/test-logger';
import { assertMessageReceived } from './helpers/test-assertions';
import { TEST_CREDENTIALS, TEST_PROMPTS, TIMEOUT_VALUES, createAgentArgs, WEBSOCKET_MESSAGE_TYPES } from './helpers/test-fixtures';

const BASE_URL = process.env.TEST_BASE_URL || 'https://onaria.xyz';

describe('WebSocket Flow', () => {
	let client: TestApiClient;
	let logger: TestLogger;
	let agentId: string;
	let websocketUrl: string;
	let sessionCookie: string | null = null;
	let rateLimited = false;

	beforeAll(async () => {
		logger = new TestLogger('websocket-flow');
		client = new TestApiClient(BASE_URL, process.env.VERBOSE === 'true');

		try {
			// Login and create agent
			logger.info('Setting up test...');
			const loginResponse = await client.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

			// Extract session cookie (simplified - in real implementation we'd get it from client)
			sessionCookie = 'session-placeholder'; // Client should expose this

			const agentResponse = await client.createAgent(createAgentArgs(TEST_PROMPTS.simpleCounter));
			agentId = agentResponse.agentId;
			websocketUrl = agentResponse.websocketUrl;

			logger.info('Test setup complete', { agentId, websocketUrl });
		} catch (error) {
			if (error instanceof RateLimitError) {
				logger.info('Rate limit hit during setup, will skip all tests');
				rateLimited = true;
			} else {
				throw error;
			}
		}
	});

	afterAll(() => {
		logger.printSummary();
		logger.saveLogs();
	});

	it(
		'should connect to WebSocket successfully',
		async ({ skip }) => {
			if (rateLimited) {
				logger.info('Skipping test due to rate limit');
				skip();
				return;
			}

			logger.logStage('WebSocket Connection', 'started');

			const wsClient = new TestWebSocketClient(process.env.VERBOSE === 'true');

			// Note: We need to pass session cookie - this is a simplified test
			// In production, we'd need to extract the actual session cookie from HTTP client
			await expect(
				wsClient.connect(websocketUrl, sessionCookie || '', TIMEOUT_VALUES.websocketConnect)
			).resolves.not.toThrow();

			expect(wsClient.isConnected()).toBe(true);

			logger.logAssertion('WebSocket connected', true);
			logger.logStage('WebSocket Connection', 'completed');

			await wsClient.close();
		},
		{ timeout: TIMEOUT_VALUES.websocketConnect + 5000 }
	);

	it(
		'should receive agent_connected message',
		async ({ skip }) => {
			if (rateLimited) {
				logger.info('Skipping test due to rate limit');
				skip();
				return;
			}

			logger.logStage('Initial Message Reception', 'started');

			const wsClient = new TestWebSocketClient(process.env.VERBOSE === 'true');
			await wsClient.connect(websocketUrl, sessionCookie || '', TIMEOUT_VALUES.websocketConnect);

			const message = await wsClient.waitForMessage(
				WEBSOCKET_MESSAGE_TYPES.agent_connected,
				30000
			);

			expect(message).toBeDefined();
			expect(message.type).toBe(WEBSOCKET_MESSAGE_TYPES.agent_connected);
			expect(message.state).toBeDefined();

			logger.logAssertion('agent_connected message received', true);
			logger.logStage('Initial Message Reception', 'completed');

			await wsClient.close();
		},
		{ timeout: 35000 }
	);

	it(
		'should track state updates',
		async ({ skip }) => {
			if (rateLimited) {
				logger.info('Skipping test due to rate limit');
				skip();
				return;
			}

			logger.logStage('State Tracking', 'started');

			const wsClient = new TestWebSocketClient(process.env.VERBOSE === 'true');
			await wsClient.connect(websocketUrl, sessionCookie || '', TIMEOUT_VALUES.websocketConnect);

			// Wait for initial state
			await wsClient.waitForMessage(WEBSOCKET_MESSAGE_TYPES.agent_connected, 30000);

			const state = wsClient.getLatestState();
			expect(state).toBeDefined();
			expect(state?.currentDevState).toBeDefined();

			logger.logAssertion('State tracked successfully', true, {
				currentDevState: state?.currentDevState,
			});

			logger.logStage('State Tracking', 'completed');

			await wsClient.close();
		},
		{ timeout: 35000 }
	);

	it(
		'should collect multiple messages',
		async ({ skip }) => {
			if (rateLimited) {
				logger.info('Skipping test due to rate limit');
				skip();
				return;
			}

			logger.logStage('Message Collection', 'started');

			const wsClient = new TestWebSocketClient(process.env.VERBOSE === 'true');
			await wsClient.connect(websocketUrl, sessionCookie || '', TIMEOUT_VALUES.websocketConnect);

			// Wait and collect messages for 10 seconds
			const messages = await wsClient.collectMessages(10000);

			expect(messages.length).toBeGreaterThanOrEqual(1); // Should have at least agent_connected

			const allMessages = wsClient.getAllMessages();
			assertMessageReceived(allMessages, WEBSOCKET_MESSAGE_TYPES.agent_connected);

			logger.logAssertion('Messages collected', true, {
				messageCount: allMessages.length,
			});

			logger.logStage('Message Collection', 'completed');

			await wsClient.close();
		},
		{ timeout: 20000 }
	);

	it(
		'should handle reconnection',
		async ({ skip }) => {
			if (rateLimited) {
				logger.info('Skipping test due to rate limit');
				skip();
				return;
			}

			logger.logStage('WebSocket Reconnection', 'started');

			// First connection
			const wsClient1 = new TestWebSocketClient(process.env.VERBOSE === 'true');
			await wsClient1.connect(websocketUrl, sessionCookie || '', TIMEOUT_VALUES.websocketConnect);
			await wsClient1.waitForMessage(WEBSOCKET_MESSAGE_TYPES.agent_connected, 30000);
			await wsClient1.close();

			// Reconnect
			const wsClient2 = new TestWebSocketClient(process.env.VERBOSE === 'true');
			await wsClient2.connect(websocketUrl, sessionCookie || '', TIMEOUT_VALUES.websocketConnect);
			const message = await wsClient2.waitForMessage(WEBSOCKET_MESSAGE_TYPES.agent_connected, 30000);

			expect(message.state).toBeDefined();
			logger.logAssertion('Reconnection successful with state restoration', true);

			logger.logStage('WebSocket Reconnection', 'completed');

			await wsClient2.close();
		},
		{ timeout: 70000 }
	);
});
