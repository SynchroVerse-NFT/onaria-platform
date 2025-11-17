/**
 * Tests for AppService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppService } from './AppService';
import type * as schema from '../schema';

// Mock database
const createMockDb = () => ({
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	orderBy: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	offset: vi.fn().mockReturnThis(),
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	returning: vi.fn().mockResolvedValue([]),
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	delete: vi.fn().mockReturnThis(),
	leftJoin: vi.fn().mockReturnThis(),
	innerJoin: vi.fn().mockReturnThis(),
});

// Mock logger
const createMockLogger = () => ({
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
});

describe('AppService', () => {
	let appService: AppService;
	let mockDb: ReturnType<typeof createMockDb>;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		mockDb = createMockDb();
		mockLogger = createMockLogger();

		// Create service with mocked dependencies
		appService = new AppService(
			mockDb as any,
			mockDb as any,
			null as any,
			mockLogger as any
		);

		vi.clearAllMocks();
	});

	describe('createApp', () => {
		it('should create a new app successfully', async () => {
			const mockAppData: schema.NewApp = {
				id: 'test-app-id',
				userId: 'user-123',
				name: 'Test App',
				description: 'A test application',
				visibility: 'public',
				status: 'pending',
			};

			const mockCreatedApp = {
				...mockAppData,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			mockDb.returning.mockResolvedValue([mockCreatedApp]);

			const result = await appService.createApp(mockAppData);

			expect(mockDb.insert).toHaveBeenCalled();
			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining(mockAppData)
			);
			expect(result).toEqual(mockCreatedApp);
		});

		it('should handle database errors during app creation', async () => {
			const mockAppData: schema.NewApp = {
				id: 'test-app-id',
				userId: 'user-123',
				name: 'Test App',
				description: 'A test application',
				visibility: 'public',
				status: 'pending',
			};

			mockDb.returning.mockRejectedValue(new Error('Database error'));

			await expect(appService.createApp(mockAppData)).rejects.toThrow('Database error');
		});
	});

	describe('getPublicApps', () => {
		it('should return empty array when no apps found', async () => {
			// Mock the executeRankedQuery to return empty array
			vi.spyOn(appService as any, 'executeRankedQuery').mockResolvedValue([]);

			// Mock count query
			mockDb.select.mockReturnThis();
			mockDb.from.mockReturnThis();
			mockDb.where.mockResolvedValue([{ count: 0 }]);

			const result = await appService.getPublicApps({
				limit: 20,
				offset: 0,
			});

			expect(result.data).toEqual([]);
			expect(result.pagination.total).toBe(0);
			expect(result.pagination.hasMore).toBe(false);
		});

		it('should apply default pagination options', async () => {
			vi.spyOn(appService as any, 'executeRankedQuery').mockResolvedValue([]);
			mockDb.select.mockReturnThis();
			mockDb.from.mockReturnThis();
			mockDb.where.mockResolvedValue([{ count: 0 }]);

			await appService.getPublicApps();

			expect((appService as any).executeRankedQuery).toHaveBeenCalledWith(
				expect.anything(),
				expect.anything(),
				'recent',
				'all',
				'desc',
				20,
				0
			);
		});

		it('should handle search parameter', async () => {
			vi.spyOn(appService as any, 'executeRankedQuery').mockResolvedValue([]);
			vi.spyOn(appService as any, 'buildPublicAppConditions').mockReturnValue([]);
			mockDb.select.mockReturnThis();
			mockDb.from.mockReturnThis();
			mockDb.where.mockResolvedValue([{ count: 0 }]);

			await appService.getPublicApps({
				search: 'test query',
			});

			expect((appService as any).buildPublicAppConditions).toHaveBeenCalledWith(
				undefined,
				'test query'
			);
		});

		it('should handle framework filter', async () => {
			vi.spyOn(appService as any, 'executeRankedQuery').mockResolvedValue([]);
			vi.spyOn(appService as any, 'buildPublicAppConditions').mockReturnValue([]);
			mockDb.select.mockReturnThis();
			mockDb.from.mockReturnThis();
			mockDb.where.mockResolvedValue([{ count: 0 }]);

			await appService.getPublicApps({
				framework: 'react',
			});

			expect((appService as any).buildPublicAppConditions).toHaveBeenCalledWith(
				'react',
				undefined
			);
		});
	});

	describe('error handling', () => {
		it('should log errors when queries fail', async () => {
			const error = new Error('Database connection failed');
			vi.spyOn(appService as any, 'executeRankedQuery').mockRejectedValue(error);

			await expect(appService.getPublicApps()).rejects.toThrow('Database connection failed');
			expect(mockLogger.error).toHaveBeenCalledWith(
				'executeRankedQuery failed',
				expect.objectContaining({
					errorMessage: 'Database connection failed',
				})
			);
		});
	});
});
