/**
 * Integration Test: App Creation
 * Tests agent creation with various prompts and template selection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestApiClient, RateLimitError } from './helpers/test-api-client';
import { TestLogger } from './helpers/test-logger';
import { TEST_CREDENTIALS, TEST_PROMPTS, TIMEOUT_VALUES, createAgentArgs } from './helpers/test-fixtures';

const BASE_URL = process.env.TEST_BASE_URL || 'https://onaria.xyz';

describe('App Creation', () => {
	let client: TestApiClient;
	let logger: TestLogger;

	beforeAll(async () => {
		logger = new TestLogger('app-creation');
		client = new TestApiClient(BASE_URL, process.env.VERBOSE === 'true');

		// Login before tests
		logger.info('Logging in...');
		await client.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
	});

	afterAll(() => {
		logger.printSummary();
		logger.saveLogs();
	});

	it(
		'should create agent with simple todo prompt',
		async ({ skip }) => {
			logger.logStage('Agent Creation', 'started', { prompt: 'simpleTodo' });

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				const args = createAgentArgs(TEST_PROMPTS.simpleTodo);
				const response = await client.createAgent(args);

				expect(response.agentId).toBeDefined();
				expect(response.websocketUrl).toBeDefined();
				expect(response.template).toBeDefined();
				expect(response.template.name).toBeDefined();

				logger.logAssertion('Agent created successfully', true, {
					agentId: response.agentId,
					template: response.template.name,
				});

				logger.logStage('Agent Creation', 'completed');
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.agentCreation }
	);

	it(
		'should create agent with counter prompt',
		async ({ skip }) => {
			logger.logStage('Agent Creation', 'started', { prompt: 'simpleCounter' });

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				const args = createAgentArgs(TEST_PROMPTS.simpleCounter);
				const response = await client.createAgent(args);

				expect(response.agentId).toBeDefined();
				expect(response.websocketUrl).toMatch(/^wss?:\/\//);
				expect(response.httpStatusUrl).toBeDefined();

				logger.logAssertion('Agent created with WebSocket URL', true, {
					agentId: response.agentId,
				});

				logger.logStage('Agent Creation', 'completed');
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.agentCreation }
	);

	it(
		'should create agent with explicit framework selection',
		async ({ skip }) => {
			logger.logStage('Agent Creation', 'started', { frameworks: ['react', 'vite'] });

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				const args = createAgentArgs(TEST_PROMPTS.noteApp, {
					frameworks: ['react', 'vite'],
					selectedTemplate: 'auto',
				});

				const response = await client.createAgent(args);

				expect(response.agentId).toBeDefined();
				expect(response.template.files).toBeDefined();
				expect(response.template.files.length).toBeGreaterThan(0);

				logger.logAssertion('Agent created with framework selection', true, {
					templateFiles: response.template.files.length,
				});

				logger.logStage('Agent Creation', 'completed');
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.agentCreation }
	);

	it(
		'should handle deterministic mode',
		async ({ skip }) => {
			logger.logStage('Agent Creation', 'started', { mode: 'deterministic' });

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				const args = createAgentArgs(TEST_PROMPTS.calculator, {
					agentMode: 'deterministic',
				});

				const response = await client.createAgent(args);

				expect(response.agentId).toBeDefined();
				expect(response.message).toBeDefined();

				logger.logAssertion('Deterministic mode agent created', true);
				logger.logStage('Agent Creation', 'completed');
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.agentCreation }
	);

	it(
		'should handle smart mode',
		async ({ skip }) => {
			logger.logStage('Agent Creation', 'started', { mode: 'smart' });

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				const args = createAgentArgs(TEST_PROMPTS.timerApp, {
					agentMode: 'smart',
				});

				const response = await client.createAgent(args);

				expect(response.agentId).toBeDefined();
				expect(response.websocketUrl).toBeDefined();

				logger.logAssertion('Smart mode agent created', true);
				logger.logStage('Agent Creation', 'completed');
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.agentCreation }
	);
});
