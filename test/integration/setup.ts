/**
 * Integration Test Setup
 * Global configuration and utilities for integration tests
 */

import { beforeAll, afterAll } from 'vitest';

// Validate environment
const requiredEnvVars = ['TEST_BASE_URL'];
const optionalEnvVars = ['VERBOSE', 'TEST_TIMEOUT'];

// Set defaults
if (!process.env.TEST_BASE_URL) {
	process.env.TEST_BASE_URL = 'https://onaria.xyz';
}

if (!process.env.TEST_TIMEOUT) {
	process.env.TEST_TIMEOUT = '600000'; // 10 minutes
}

// Log configuration
console.log('\n=== Integration Test Configuration ===');
console.log(`Base URL: ${process.env.TEST_BASE_URL}`);
console.log(`Verbose: ${process.env.VERBOSE || 'false'}`);
console.log(`Default Timeout: ${process.env.TEST_TIMEOUT}ms`);
console.log('=====================================\n');

// Global setup
beforeAll(() => {
	console.log('Starting integration test suite...\n');
});

// Global teardown
afterAll(() => {
	console.log('\nIntegration test suite completed');
});

// Export test credentials (can be overridden via env)
export const getTestCredentials = () => ({
	email: process.env.TEST_EMAIL || 'info@synchroverse.io',
	password: process.env.TEST_PASSWORD || 'Synchro2025$$',
});

// Export base URL
export const getBaseUrl = () => process.env.TEST_BASE_URL || 'https://onaria.xyz';

// Export verbose mode
export const isVerbose = () => process.env.VERBOSE === 'true';
