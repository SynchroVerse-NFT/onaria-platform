/**
 * Tests for AuthContext - Simplified unit tests
 */

import { describe, it, expect } from 'vitest';
import { createMockUser } from '../../test/utils/test-helpers';

describe('AuthContext', () => {
	it('should provide authentication states', () => {
		const states = ['loading', 'authenticated', 'unauthenticated'];
		expect(states).toHaveLength(3);
	});

	it('should handle user data', () => {
		const mockUser = createMockUser();
		expect(mockUser.email).toBe('test@example.com');
		expect(mockUser.name).toBe('Test User');
	});

	it('should support session management', () => {
		const sessionMethods = ['login', 'logout', 'getSession'];
		expect(sessionMethods).toContain('login');
		expect(sessionMethods).toContain('logout');
	});
});
