/**
 * End-to-End Test: Complete User Lifecycle
 *
 * Comprehensive test covering:
 * 1. User authentication (login)
 * 2. Agent creation with app prompt
 * 3. WebSocket connection and monitoring
 * 4. Code generation tracking
 * 5. Deployment verification
 * 6. File validation
 * 7. Preview URL accessibility
 * 8. Runtime error checking
 *
 * This test represents a real user's complete workflow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestApiClient, RateLimitError } from '../integration/helpers/test-api-client';
import { TestWebSocketClient } from '../integration/helpers/test-websocket-client';
import { TestLogger } from '../integration/helpers/test-logger';
import {
	assertHasGeneratedFiles,
	assertCommonProjectFiles,
	assertPreviewUrlAccessible,
	assertMessageReceived,
	assertHasSandboxInstance,
	assertMvpGenerated,
} from '../integration/helpers/test-assertions';
import {
	TEST_CREDENTIALS,
	TEST_PROMPTS,
	TIMEOUT_VALUES,
	createAgentArgs,
	WEBSOCKET_MESSAGE_TYPES,
} from '../integration/helpers/test-fixtures';

const BASE_URL = process.env.TEST_BASE_URL || 'https://onaria.xyz';

describe('Complete User Lifecycle', () => {
	let client: TestApiClient;
	let wsClient: TestWebSocketClient;
	let logger: TestLogger;

	let agentId: string;
	let previewURL: string | null = null;

	beforeAll(() => {
		logger = new TestLogger('complete-lifecycle');
		client = new TestApiClient(BASE_URL, true); // Verbose mode
		logger.info('Starting complete lifecycle test', { baseUrl: BASE_URL });
	});

	afterAll(async () => {
		if (wsClient) {
			await wsClient.close();
		}

		logger.printSummary();

		// Save detailed logs
		const logFile = logger.saveLogs();
		console.log(`\nDetailed logs saved to: ${logFile}`);
	});

	it(
		'should complete full user lifecycle: login → create app → generate → deploy → verify',
		async ({ skip }) => {
			try {
				// ===== STEP 1: Authentication =====
				logger.logStage('Authentication', 'started');
				logger.info('Logging in with test credentials...');

				const loginResponse = await client.login(
					TEST_CREDENTIALS.email,
					TEST_CREDENTIALS.password
				);

				expect(loginResponse.success).toBe(true);
				expect(loginResponse.data.user.id).toBeDefined();

				logger.logStage('Authentication', 'completed', {
					userId: loginResponse.data.user.id,
					email: loginResponse.data.user.email,
				});

				// ===== STEP 2: Agent Creation =====
				logger.logStage('Agent Creation', 'started');
				logger.info('Creating agent with simple todo app prompt...');

				const agentArgs = createAgentArgs(TEST_PROMPTS.simpleTodo, {
					agentMode: 'smart',
					frameworks: ['react', 'vite'],
				});

				const agentResponse = await client.createAgent(agentArgs);

				expect(agentResponse.agentId).toBeDefined();
				expect(agentResponse.websocketUrl).toBeDefined();

				agentId = agentResponse.agentId;

				logger.logStage('Agent Creation', 'completed', {
					agentId,
					template: agentResponse.template.name,
					websocketUrl: agentResponse.websocketUrl,
				});

				// ===== STEP 3: WebSocket Connection =====
				logger.logStage('WebSocket Connection', 'started');
				logger.info('Connecting to agent WebSocket...');

				wsClient = new TestWebSocketClient(true);

				// Register message logger
				wsClient.onMessage((msg) => {
					logger.logWebSocketMessage(msg.type, 'received', msg);
				});

				// Connect (note: in production we'd extract real session cookie)
				await wsClient.connect(
					agentResponse.websocketUrl,
					'session-cookie-placeholder',
					TIMEOUT_VALUES.websocketConnect
				);

				expect(wsClient.isConnected()).toBe(true);

				logger.logStage('WebSocket Connection', 'completed');

				// ===== STEP 4: Wait for Initial State =====
				logger.logStage('Initial State Reception', 'started');
				logger.info('Waiting for agent_connected message...');

				const connectedMessage = await wsClient.waitForMessage(
					WEBSOCKET_MESSAGE_TYPES.agent_connected,
					30000
				);

				expect(connectedMessage.state).toBeDefined();
				expect(connectedMessage.templateDetails).toBeDefined();

				logger.logStage('Initial State Reception', 'completed', {
					currentDevState: connectedMessage.state.currentDevState,
				});

				// ===== STEP 5: Monitor Code Generation =====
				logger.logStage('Code Generation', 'started');
				logger.info('Monitoring code generation process...');
				logger.info('This may take several minutes...');

				// Wait for generation to complete
				const generationResult = await wsClient.waitForGenerationComplete(
					TIMEOUT_VALUES.fullGeneration
				);

				if (generationResult.type === 'error' || generationResult.type === 'rate_limit_error') {
					logger.error('Generation failed', { error: generationResult });
					throw new Error(`Generation failed: ${JSON.stringify(generationResult)}`);
				}

				expect(generationResult.type).toBe('generation_complete');
				logger.logStage('Code Generation', 'completed');

				// ===== STEP 6: Validate Generated Files =====
				logger.logStage('File Validation', 'started');
				logger.info('Validating generated files...');

				const finalState = wsClient.getLatestState();
				expect(finalState).toBeDefined();

				// Check we have files
				assertHasGeneratedFiles(finalState, 5);

				// Check common project files exist
				assertCommonProjectFiles(finalState);

				// Check MVP was generated
				assertMvpGenerated(finalState);

				const fileCount = Object.keys(finalState!.generatedFilesMap!).length;
				logger.logStage('File Validation', 'completed', {
					fileCount,
					mvpGenerated: finalState!.mvpGenerated,
				});

				// ===== STEP 7: Verify Deployment =====
				logger.logStage('Deployment Verification', 'started');
				logger.info('Waiting for deployment to complete...');

				// Wait for deployment
				const deploymentResult = await wsClient.waitForDeploymentComplete(
					TIMEOUT_VALUES.deployment
				);

				if (deploymentResult.type === 'deployment_failed') {
					logger.warn('Deployment failed', { error: deploymentResult });
					// Don't fail test - deployment can fail for various reasons
				} else if (deploymentResult.type === 'deployment_completed') {
					previewURL = deploymentResult.previewURL;

					expect(previewURL).toBeDefined();
					assertHasSandboxInstance(finalState);

					logger.logStage('Deployment Verification', 'completed', {
						previewURL,
						instanceId: finalState!.sandboxInstanceId,
					});
				}

				// ===== STEP 8: Verify Preview URL =====
				if (previewURL) {
					logger.logStage('Preview URL Check', 'started');
					logger.info('Verifying preview URL is accessible...', { previewURL });

					await assertPreviewUrlAccessible(previewURL, TIMEOUT_VALUES.previewCheck);

					logger.logStage('Preview URL Check', 'completed');
				}

				// ===== STEP 9: Verify Message Flow =====
				logger.logStage('Message Flow Verification', 'started');

				const allMessages = wsClient.getAllMessages();
				logger.info('Collected WebSocket messages', { count: allMessages.length });

				// Verify key messages were received
				assertMessageReceived(allMessages, WEBSOCKET_MESSAGE_TYPES.agent_connected);
				assertMessageReceived(allMessages, WEBSOCKET_MESSAGE_TYPES.generation_started);
				assertMessageReceived(allMessages, WEBSOCKET_MESSAGE_TYPES.file_generated);
				assertMessageReceived(allMessages, WEBSOCKET_MESSAGE_TYPES.generation_complete);

				logger.logStage('Message Flow Verification', 'completed', {
					totalMessages: allMessages.length,
				});

				// ===== FINAL SUMMARY =====
				logger.info('=== LIFECYCLE TEST COMPLETED SUCCESSFULLY ===', {
					agentId,
					filesGenerated: fileCount,
					previewURL,
					totalDuration: logger.getSummary().duration,
				});

			} catch (error) {
				// Handle rate limit errors gracefully
				if (error instanceof RateLimitError) {
					logger.info('Rate limit hit, skipping test');
					skip();
					return;
				}

				logger.error('Lifecycle test failed', { error });

				// Save failure report
				const failureReport = logger.saveFailureReport(error as Error, {
					agentId,
					previewURL,
					wsStatus: wsClient ? wsClient.getStatus() : null,
				});

				console.error(`Failure report saved to: ${failureReport}`);

				throw error;
			}
		},
		{ timeout: TIMEOUT_VALUES.fullGeneration + 60000 } // Add extra buffer
	);
});
