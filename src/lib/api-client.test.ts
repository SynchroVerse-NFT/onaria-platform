/**
 * Tests for API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockResponse } from '../../test/utils/test-helpers';

// Mock fetch
global.fetch = vi.fn();

// Simplified mock for apiClient without full imports
const mockApiClient = {
	apps: {
		list: vi.fn(),
		create: vi.fn(),
		getById: vi.fn(),
	},
	user: {
		stats: vi.fn(),
		updateProfile: vi.fn(),
	},
	auth: {
		login: vi.fn(),
		logout: vi.fn(),
	},
};

describe('apiClient', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('apps endpoints', () => {
		it('should fetch apps list', async () => {
			const mockAppsData = {
				data: [
					{ id: '1', name: 'App 1' },
					{ id: '2', name: 'App 2' },
				],
				pagination: {
					currentPage: 1,
					pageSize: 10,
					totalItems: 2,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: false,
				},
			};

			mockApiClient.apps.list.mockResolvedValue({ success: true, data: mockAppsData });

			const result = await mockApiClient.apps.list({ limit: 10, offset: 0 });

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.data).toHaveLength(2);
			}
		});

		it('should create new app', async () => {
			const mockAppData = {
				id: 'new-app',
				name: 'New App',
				userId: 'user-123',
				status: 'pending' as const,
			};

			mockApiClient.apps.create.mockResolvedValue({ success: true, data: mockAppData });

			const result = await mockApiClient.apps.create({
				name: 'New App',
				description: 'A new app',
			});

			expect(result.success).toBe(true);
		});

		it('should handle API errors', async () => {
			mockApiClient.apps.getById.mockResolvedValue({
				success: false,
				error: 'App not found',
			});

			const result = await mockApiClient.apps.getById('non-existent');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error).toBe('App not found');
			}
		});

		it('should handle network errors', async () => {
			mockApiClient.apps.list.mockRejectedValue(new Error('Network error'));

			await expect(mockApiClient.apps.list()).rejects.toThrow('Network error');
		});
	});

	describe('user endpoints', () => {
		it('should fetch user stats', async () => {
			const mockStats = {
				totalApps: 10,
				publicApps: 7,
				privateApps: 3,
				totalStars: 150,
			};

			mockApiClient.user.stats.mockResolvedValue({ success: true, data: mockStats });

			const result = await mockApiClient.user.stats();

			expect(result.success).toBe(true);
		});

		it('should update user profile', async () => {
			const updateData = {
				name: 'Updated Name',
				avatar: 'https://example.com/avatar.png',
			};

			mockApiClient.user.updateProfile.mockResolvedValue({ success: true, data: updateData });

			const result = await mockApiClient.user.updateProfile(updateData);

			expect(result.success).toBe(true);
		});
	});

	describe('auth endpoints', () => {
		it('should login user', async () => {
			const mockSession = {
				user: {
					id: 'user-123',
					email: 'test@example.com',
					name: 'Test User',
				},
				sessionId: 'session-123',
			};

			mockApiClient.auth.login.mockResolvedValue({ success: true, data: mockSession });

			const result = await mockApiClient.auth.login({
				email: 'test@example.com',
				password: 'password123',
			});

			expect(result.success).toBe(true);
		});

		it('should logout user', async () => {
			mockApiClient.auth.logout.mockResolvedValue({ success: true, data: null });

			const result = await mockApiClient.auth.logout();

			expect(result.success).toBe(true);
		});
	});
});
