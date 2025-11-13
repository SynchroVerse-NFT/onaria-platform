/**
 * Vitest Configuration for Integration Tests
 * Separate config with longer timeouts and sequential execution
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		// Test environment
		name: 'integration',

		// Run tests sequentially (not in parallel)
		// This prevents race conditions and resource conflicts
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: true, // All tests in single process
			},
		},

		// Timeouts
		testTimeout: 600000, // 10 minutes per test (generation can be slow)
		hookTimeout: 30000,  // 30 seconds for hooks

		// Setup files
		setupFiles: ['./test/integration/setup.ts'],

		// Test file patterns
		include: [
			'test/integration/**/*.test.ts',
			'test/e2e/**/*.test.ts',
		],
		exclude: [
			'node_modules',
			'dist',
			'build',
			'.wrangler',
		],

		// Globals
		globals: true,

		// Reporters
		reporters: process.env.CI ? ['json', 'github-actions'] : ['verbose'],

		// Coverage (optional)
		coverage: {
			enabled: false, // Integration tests don't measure code coverage
		},

		// Retry failed tests
		retry: process.env.CI ? 2 : 0, // Retry twice in CI, none locally

		// Fail fast (stop on first failure)
		bail: process.env.FAIL_FAST === 'true' ? 1 : 0,

		// Environment variables
		env: {
			TEST_BASE_URL: process.env.TEST_BASE_URL || 'https://onaria.xyz',
			VERBOSE: process.env.VERBOSE || 'false',
			NODE_ENV: 'test',
		},
	},

	// Resolve aliases
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@test': path.resolve(__dirname, './test'),
		},
	},
});
