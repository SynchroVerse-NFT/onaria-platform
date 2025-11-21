/**
 * Database mocks for testing
 * Provides mock D1Database and Env objects for unit tests
 */

import { vi } from 'vitest';
import type { D1Database, D1PreparedStatement, D1Result } from '@cloudflare/workers-types';

/**
 * Create a mock D1PreparedStatement
 */
function createMockPreparedStatement(): D1PreparedStatement {
	const statement = {
		bind: vi.fn().mockReturnThis(),
		first: vi.fn().mockResolvedValue(null),
		run: vi.fn().mockResolvedValue({
			success: true,
			meta: { changes: 1, last_row_id: 1, duration: 0.1 },
			results: []
		} as D1Result),
		all: vi.fn().mockResolvedValue({
			success: true,
			meta: { changes: 0, last_row_id: 0, duration: 0.1 },
			results: []
		} as D1Result),
		raw: vi.fn().mockResolvedValue([]),
	} as unknown as D1PreparedStatement;

	return statement;
}

/**
 * Create a mock D1Database with transaction support
 */
export function createMockD1Database(): D1Database {
	const mockDb = {
		prepare: vi.fn().mockImplementation(() => createMockPreparedStatement()),
		dump: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
		batch: vi.fn().mockImplementation(async (statements: D1PreparedStatement[]) => {
			return statements.map(() => ({
				success: true,
				meta: { changes: 1, last_row_id: 1, duration: 0.1 },
				results: []
			} as D1Result));
		}),
		exec: vi.fn().mockResolvedValue({
			count: 0,
			duration: 0.1
		}),
	} as unknown as D1Database;

	return mockDb;
}

/**
 * Create a mock Env object with all required bindings
 */
export function createMockEnv(db?: D1Database): Env {
	return {
		DB: db || createMockD1Database(),

		// Durable Objects
		CODE_GENERATOR_AGENT: {} as DurableObjectNamespace,
		USER_APP_SANDBOX_SERVICE: {} as DurableObjectNamespace,
		DO_RATE_LIMIT_STORE: {} as DurableObjectNamespace,

		// KV Stores
		CACHE_KV: {} as KVNamespace,
		RATE_LIMIT_KV: {} as KVNamespace,

		// R2 Buckets
		SCREENSHOTS_BUCKET: {} as R2Bucket,
		CONTAINER_IMAGES: {} as R2Bucket,

		// Secrets
		JWT_SECRET: 'test-jwt-secret-key-for-testing-only-not-production',
		GOOGLE_AI_API_KEY: 'test-google-ai-key',
		OPENAI_API_KEY: 'test-openai-key',
		ANTHROPIC_API_KEY: 'test-anthropic-key',

		// OAuth
		GITHUB_CLIENT_ID: 'test-github-client-id',
		GITHUB_CLIENT_SECRET: 'test-github-client-secret',
		GOOGLE_CLIENT_ID: 'test-google-client-id',
		GOOGLE_CLIENT_SECRET: 'test-google-client-secret',

		// Email
		RESEND_API_KEY: 'test-resend-key',

		// Cloudflare
		CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
		CLOUDFLARE_API_TOKEN: 'test-api-token',

		// Analytics (optional)
		SENTRY_DSN: undefined,
		AI_GATEWAY_AUTH_TOKEN: undefined,

		// Environment
		ENVIRONMENT: 'test' as 'production' | 'development' | 'test',
	} as Env;
}

/**
 * Create a mock Request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Request {
	return {
		url: 'http://localhost:3000/api/test',
		method: 'POST',
		headers: new Headers({
			'user-agent': 'test-agent',
			'x-forwarded-for': '127.0.0.1',
			'content-type': 'application/json',
		}),
		cf: {
			colo: 'TEST',
		},
		...overrides,
	} as Request;
}

/**
 * Create a mock transaction wrapper
 * Simulates Drizzle's transaction behavior for testing
 */
export function createMockTransaction<T>(
	callback: (tx: unknown) => Promise<T>
): Promise<T> {
	// Create a mock transaction object that proxies to the main db
	const mockTx = new Proxy({}, {
		get(target, prop) {
			// Return the same methods as the main database
			return vi.fn();
		}
	});

	return callback(mockTx);
}
