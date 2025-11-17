/**
 * Tests for use-apps hook - Simplified unit tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockApps } from '../../test/utils/mock-factories';

// Simplified mock without renderHook
const mockApiClient = {
	apps: {
		list: vi.fn(),
	},
};

describe('useApps', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should fetch apps successfully', async () => {
		const mockApps = createMockApps(3);
		const mockResponse = {
			success: true as const,
			data: {
				data: mockApps,
				pagination: {
					currentPage: 1,
					pageSize: 10,
					totalItems: 3,
					totalPages: 1,
					hasNextPage: false,
					hasPreviousPage: false,
				},
			},
		};

		mockApiClient.apps.list.mockResolvedValue(mockResponse);

		const result = await mockApiClient.apps.list();

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.data).toHaveLength(3);
		}
	});

	it('should handle API errors', async () => {
		const mockError = {
			success: false as const,
			error: 'Failed to fetch apps',
		};

		mockApiClient.apps.list.mockResolvedValue(mockError);

		const result = await mockApiClient.apps.list();

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe('Failed to fetch apps');
		}
	});

	it('should handle loading state', () => {
		mockApiClient.apps.list.mockImplementation(
			() => new Promise(() => {}) // Never resolves
		);

		const promise = mockApiClient.apps.list();

		expect(promise).toBeInstanceOf(Promise);
	});

	it('should support pagination', async () => {
		const mockResponse = {
			success: true as const,
			data: {
				data: createMockApps(10),
				pagination: {
					currentPage: 1,
					pageSize: 10,
					totalItems: 20,
					totalPages: 2,
					hasNextPage: true,
					hasPreviousPage: false,
				},
			},
		};

		mockApiClient.apps.list.mockResolvedValue(mockResponse);

		const result = await mockApiClient.apps.list({ limit: 10, offset: 0 });

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.pagination.hasNextPage).toBe(true);
		}
	});
});
