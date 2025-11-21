/**
 * Database test utilities
 */

import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../worker/database/schema';
import type { DrizzleD1Database } from 'drizzle-orm/d1';

/**
 * Create a test database service (without Sentry instrumentation)
 */
export function createTestDatabase(db: D1Database): DrizzleD1Database<typeof schema> {
	return drizzle(db, { schema });
}

/**
 * Reset database tables for testing
 */
export async function resetDatabase(db: D1Database) {
	// Delete test data in reverse order of dependencies
	await db.prepare('DELETE FROM app_stars').run();
	await db.prepare('DELETE FROM app_views').run();
	await db.prepare('DELETE FROM app_forks').run();
	await db.prepare('DELETE FROM analytics_events').run();
	await db.prepare('DELETE FROM user_sessions').run();
	await db.prepare('DELETE FROM apps').run();
	await db.prepare('DELETE FROM users').run();
}

/**
 * Seed test user
 */
export async function seedTestUser(db: D1Database, userId: string = 'test-user-id') {
	await db.prepare(`
		INSERT INTO users (id, email, name, provider, provider_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`).bind(
		userId,
		'test@example.com',
		'Test User',
		'email',
		'provider-123',
		new Date().toISOString(),
		new Date().toISOString()
	).run();
}

/**
 * Seed test app
 */
export async function seedTestApp(db: D1Database, appId: string = 'test-app-id', userId: string = 'test-user-id') {
	await db.prepare(`
		INSERT INTO apps (id, user_id, name, description, status, visibility, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`).bind(
		appId,
		userId,
		'Test App',
		'A test application',
		'completed',
		'public',
		new Date().toISOString(),
		new Date().toISOString()
	).run();
}

/**
 * Create test logger
 */
export function createTestLogger() {
	return {
		info: () => {},
		error: () => {},
		warn: () => {},
		debug: () => {},
	};
}
