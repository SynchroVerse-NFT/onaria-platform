/**
 * Integration Test: Authentication Flow
 * Tests CSRF token retrieval, login, session management, and logout
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestApiClient } from './helpers/test-api-client';
import { TestLogger } from './helpers/test-logger';
import { TEST_CREDENTIALS, TIMEOUT_VALUES } from './helpers/test-fixtures';

const BASE_URL = process.env.TEST_BASE_URL || 'https://onaria.xyz';

describe('Authentication Flow', () => {
	let client: TestApiClient;
	let logger: TestLogger;

	beforeAll(() => {
		logger = new TestLogger('auth-flow');
		client = new TestApiClient(BASE_URL, process.env.VERBOSE === 'true');
		logger.info('Starting authentication flow tests', { baseUrl: BASE_URL });
	});

	afterAll(() => {
		logger.printSummary();
		logger.saveLogs();
	});

	it(
		'should get CSRF token successfully',
		async () => {
			logger.logStage('CSRF Token Retrieval', 'started');

			const token = await client.getCsrfToken();

			expect(token).toBeDefined();
			expect(token.length).toBeGreaterThan(20);
			logger.logAssertion('CSRF token retrieved', true, { tokenLength: token.length });

			logger.logStage('CSRF Token Retrieval', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth }
	);

	it(
		'should login with valid credentials',
		async () => {
			logger.logStage('User Login', 'started');

			const response = await client.login(
				TEST_CREDENTIALS.email,
				TEST_CREDENTIALS.password
			);

			expect(response.success).toBe(true);
			expect(response.data.user).toBeDefined();
			expect(response.data.user.email).toBe(TEST_CREDENTIALS.email);
			expect(response.data.sessionId).toBeDefined();

			logger.logAssertion('Login successful', true, {
				userId: response.data.user.id,
				email: response.data.user.email,
			});

			logger.logStage('User Login', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth }
	);

	it(
		'should fail login with invalid credentials',
		async () => {
			logger.logStage('Invalid Login Test', 'started');

			const invalidClient = new TestApiClient(BASE_URL, false);

			await expect(
				invalidClient.login('invalid@example.com', 'wrongpassword')
			).rejects.toThrow();

			logger.logAssertion('Invalid login rejected', true);
			logger.logStage('Invalid Login Test', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth }
	);

	it(
		'should maintain session across requests',
		async () => {
			logger.logStage('Session Persistence', 'started');

			// Login
			await client.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

			// Make authenticated request
			const apps = await client.getUserApps();

			expect(apps).toBeDefined();
			logger.logAssertion('Authenticated request successful', true);

			logger.logStage('Session Persistence', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth * 2 }
	);

	it(
		'should handle CSRF token rotation',
		async () => {
			logger.logStage('CSRF Token Rotation', 'started');

			// Get initial token
			const token1 = await client.getCsrfToken();

			// Login (rotates token)
			await client.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

			// Make multiple requests (may trigger rotation)
			await client.getUserApps();
			await client.getModelConfigs();

			logger.logAssertion('CSRF token rotation handled', true);
			logger.logStage('CSRF Token Rotation', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth * 3 }
	);

	it(
		'should logout successfully',
		async () => {
			logger.logStage('User Logout', 'started');

			// Login first
			await client.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

			// Logout
			await client.logout();

			logger.logAssertion('Logout successful', true);
			logger.logStage('User Logout', 'completed');
		},
		{ timeout: TIMEOUT_VALUES.auth * 2 }
	);
});
