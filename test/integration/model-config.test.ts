/**
 * Integration Test: Model Configuration
 * Tests model configuration endpoints and validation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestApiClient } from './helpers/test-api-client';
import { TestLogger } from './helpers/test-logger';
import { TEST_CREDENTIALS, MODEL_CONFIG_ACTIONS, TIMEOUT_VALUES } from './helpers/test-fixtures';

const BASE_URL = process.env.TEST_BASE_URL || 'https://onaria.xyz';

describe('Model Configuration', () => {
	let client: TestApiClient;
	let logger: TestLogger;

	beforeAll(async () => {
		logger = new TestLogger('model-config');
		client = new TestApiClient(BASE_URL, process.env.VERBOSE === 'true');

		await client.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
	});

	afterAll(() => {
		logger.printSummary();
		logger.saveLogs();
	});

	it(
		'should get all model configurations',
		async () => {
			logger.logStage('Get Model Configs', 'started');

			const response: any = await client.getModelConfigs();

			expect(response.success).toBe(true);
			expect(response.data.configs).toBeDefined();

			const configKeys = Object.keys(response.data.configs);
			expect(configKeys.length).toBeGreaterThan(0);

			logger.logAssertion('Model configs retrieved', true, {
				configCount: configKeys.length,
			});

			logger.logStage('Get Model Configs', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth }
	);

	it(
		'should test conversational response config',
		async () => {
			logger.logStage('Test Model Config', 'started', { action: 'conversationalResponse' });

			const response: any = await client.testModelConfig('conversationalResponse', false);

			expect(response.success).toBe(true);
			expect(response.data.testResult).toBeDefined();

			// Test may succeed or fail due to API keys, but endpoint should work
			logger.logAssertion('Model test endpoint reached', true, {
				testSuccess: response.data.testResult.success,
			});

			logger.logStage('Test Model Config', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth * 2 }
	);

	it(
		'should handle model config test with missing API keys',
		async () => {
			logger.logStage('Test Config Without Keys', 'started');

			// Test should reach endpoint even if API keys not configured
			const response: any = await client.testModelConfig('blueprint', false);

			expect(response.success).toBe(true);
			expect(response.data.testResult).toBeDefined();

			// Even if test fails due to API keys, endpoint should respond correctly
			logger.logAssertion('Endpoint handles missing keys gracefully', true);

			logger.logStage('Test Config Without Keys', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth * 2 }
	);
});
