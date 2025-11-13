/**
 * Integration Test: Deployment
 * Tests sandbox deployment, health checks, and preview URLs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestApiClient, RateLimitError } from './helpers/test-api-client';
import { TestWebSocketClient } from './helpers/test-websocket-client';
import { TestLogger } from './helpers/test-logger';
import { assertPreviewUrlAccessible } from './helpers/test-assertions';
import { TEST_CREDENTIALS, TEST_PROMPTS, TIMEOUT_VALUES, createAgentArgs } from './helpers/test-fixtures';

const BASE_URL = process.env.TEST_BASE_URL || 'https://onaria.xyz';

describe('Deployment', () => {
	let client: TestApiClient;
	let logger: TestLogger;

	beforeAll(async () => {
		logger = new TestLogger('deployment');
		client = new TestApiClient(BASE_URL, process.env.VERBOSE === 'true');

		await client.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);
	});

	afterAll(() => {
		logger.printSummary();
		logger.saveLogs();
	});

	it(
		'should wait for automatic deployment after generation',
		async ({ skip }) => {
			logger.logStage('Automatic Deployment', 'started');

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				// Create agent
				const agentResponse = await client.createAgent(createAgentArgs(TEST_PROMPTS.simpleCounter));
				const wsClient = new TestWebSocketClient(process.env.VERBOSE === 'true');

				// Connect to WebSocket
				await wsClient.connect(agentResponse.websocketUrl, 'session-placeholder', TIMEOUT_VALUES.websocketConnect);

				// Wait for deployment_completed (this could take a while)
				logger.info('Waiting for deployment to complete...');
				const deploymentMessage = await wsClient.waitForDeploymentComplete(TIMEOUT_VALUES.deployment);

				expect(deploymentMessage.type).toBe('deployment_completed');
				expect(deploymentMessage.previewURL).toBeDefined();

				logger.logAssertion('Deployment completed', true, {
					previewURL: deploymentMessage.previewURL,
				});

				logger.logStage('Automatic Deployment', 'completed');

				await wsClient.close();
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.fullGeneration }
	);

	it(
		'should trigger manual preview deployment',
		async ({ skip }) => {
			logger.logStage('Manual Preview Deployment', 'started');

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				// Create agent first
				const agentResponse = await client.createAgent(createAgentArgs(TEST_PROMPTS.calculator));

				// Wait a bit for initial setup
				await new Promise(resolve => setTimeout(resolve, 5000));

				// Trigger manual deployment
				const deploymentResponse = await client.deployPreview(agentResponse.agentId);

				expect(deploymentResponse.success).toBe(true);
				expect(deploymentResponse.data.previewURL).toBeDefined();
				expect(deploymentResponse.data.instanceId).toBeDefined();

				logger.logAssertion('Manual deployment triggered', true, {
					instanceId: deploymentResponse.data.instanceId,
				});

				logger.logStage('Manual Preview Deployment', 'completed');
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.deployment }
	);

	it(
		'should verify preview URL accessibility',
		async ({ skip }) => {
			logger.logStage('Preview URL Verification', 'started');

			// Add delay to avoid rate limiting
			await new Promise(resolve => setTimeout(resolve, 2000));

			try {
				// Create and wait for deployment
				const agentResponse = await client.createAgent(createAgentArgs(TEST_PROMPTS.simpleCounter));
				const wsClient = new TestWebSocketClient(process.env.VERBOSE === 'true');

				await wsClient.connect(agentResponse.websocketUrl, 'session-placeholder', TIMEOUT_VALUES.websocketConnect);
				const deploymentMessage = await wsClient.waitForDeploymentComplete(TIMEOUT_VALUES.deployment);

				// Verify URL is accessible
				if (deploymentMessage.type === 'deployment_completed' && deploymentMessage.previewURL) {
					await assertPreviewUrlAccessible(deploymentMessage.previewURL, TIMEOUT_VALUES.previewCheck);

					logger.logAssertion('Preview URL accessible', true);
				}

				logger.logStage('Preview URL Verification', 'completed');

				await wsClient.close();
			} catch (error) {
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
				} else {
					throw error;
				}
			}
		},
		{ timeout: TIMEOUT_VALUES.fullGeneration }
	);
});
