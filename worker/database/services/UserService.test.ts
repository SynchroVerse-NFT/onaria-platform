/**
 * Tests for UserService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from './UserService';
import type * as schema from '../schema';

// Mock database
const createMockDb = () => ({
	select: vi.fn().mockReturnThis(),
	from: vi.fn().mockReturnThis(),
	where: vi.fn().mockReturnThis(),
	limit: vi.fn().mockReturnThis(),
	insert: vi.fn().mockReturnThis(),
	values: vi.fn().mockReturnThis(),
	returning: vi.fn().mockResolvedValue([]),
	update: vi.fn().mockReturnThis(),
	set: vi.fn().mockReturnThis(),
	delete: vi.fn().mockReturnThis(),
});

// Mock logger
const createMockLogger = () => ({
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn(),
	debug: vi.fn(),
});

describe('UserService', () => {
	let userService: UserService;
	let mockDb: ReturnType<typeof createMockDb>;
	let mockLogger: ReturnType<typeof createMockLogger>;

	beforeEach(() => {
		mockDb = createMockDb();
		mockLogger = createMockLogger();

		userService = new UserService(
			mockDb as any,
			mockDb as any,
			null as any,
			mockLogger as any
		);

		vi.clearAllMocks();
	});

	describe('createUser', () => {
		it('should create a new user successfully', async () => {
			const mockUserData: schema.NewUser = {
				email: 'test@example.com',
				name: 'Test User',
				provider: 'email',
				providerId: 'provider-123',
			};

			const mockCreatedUser = {
				id: 'user-123',
				...mockUserData,
				avatar: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastActiveAt: null,
			};

			mockDb.returning.mockResolvedValue([mockCreatedUser]);

			const result = await userService.createUser(mockUserData);

			expect(mockDb.insert).toHaveBeenCalled();
			expect(mockDb.values).toHaveBeenCalledWith(
				expect.objectContaining({
					email: mockUserData.email,
					name: mockUserData.name,
					provider: mockUserData.provider,
					providerId: mockUserData.providerId,
				})
			);
			expect(result).toEqual(mockCreatedUser);
		});

		it('should handle database errors during user creation', async () => {
			const mockUserData: schema.NewUser = {
				email: 'test@example.com',
				name: 'Test User',
				provider: 'email',
				providerId: 'provider-123',
			};

			mockDb.returning.mockRejectedValue(new Error('Database error'));

			await expect(userService.createUser(mockUserData)).rejects.toThrow('Database error');
		});
	});

	describe('findUser', () => {
		it('should find user by id', async () => {
			const mockUser = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				provider: 'email',
				providerId: 'provider-123',
				avatar: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastActiveAt: null,
			};

			mockDb.where.mockResolvedValue([mockUser]);

			const result = await userService.findUser({ id: 'user-123' });

			expect(mockDb.select).toHaveBeenCalled();
			expect(mockDb.from).toHaveBeenCalled();
			expect(result).toEqual(mockUser);
		});

		it('should find user by email', async () => {
			const mockUser = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				provider: 'email',
				providerId: 'provider-123',
				avatar: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastActiveAt: null,
			};

			mockDb.where.mockResolvedValue([mockUser]);

			const result = await userService.findUser({ email: 'test@example.com' });

			expect(mockDb.select).toHaveBeenCalled();
			expect(result).toEqual(mockUser);
		});

		it('should return null when user not found', async () => {
			mockDb.where.mockResolvedValue([]);

			const result = await userService.findUser({ id: 'non-existent' });

			expect(result).toBeNull();
		});

		it('should return null when no search criteria provided', async () => {
			const result = await userService.findUser({});

			expect(result).toBeNull();
			expect(mockDb.select).not.toHaveBeenCalled();
		});

		it('should find user by provider', async () => {
			const mockUser = {
				id: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				provider: 'google',
				providerId: 'google-123',
				avatar: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				lastActiveAt: null,
			};

			mockDb.where.mockResolvedValue([mockUser]);

			const result = await userService.findUser({
				provider: { name: 'google', id: 'google-123' }
			});

			expect(result).toEqual(mockUser);
		});
	});

	describe('updateUserActivity', () => {
		it('should update user last active timestamp', async () => {
			mockDb.set.mockReturnThis();
			mockDb.where.mockResolvedValue(undefined);

			await userService.updateUserActivity('user-123');

			expect(mockDb.update).toHaveBeenCalled();
			expect(mockDb.set).toHaveBeenCalledWith(
				expect.objectContaining({
					lastActiveAt: expect.any(Date),
					updatedAt: expect.any(Date),
				})
			);
		});
	});

	describe('createSession', () => {
		it('should create a new session successfully', async () => {
			const mockSessionData: schema.NewSession = {
				userId: 'user-123',
				expiresAt: new Date(Date.now() + 86400000),
			};

			const mockCreatedSession = {
				id: 'session-123',
				...mockSessionData,
				createdAt: new Date().toISOString(),
			};

			mockDb.returning.mockResolvedValue([mockCreatedSession]);

			const result = await userService.createSession(mockSessionData);

			expect(mockDb.insert).toHaveBeenCalled();
			expect(result).toEqual(mockCreatedSession);
		});
	});

	describe('findValidSession', () => {
		it('should find valid non-expired session', async () => {
			const mockSession = {
				id: 'session-123',
				userId: 'user-123',
				expiresAt: new Date(Date.now() + 86400000),
				createdAt: new Date().toISOString(),
			};

			mockDb.where.mockResolvedValue([mockSession]);

			const result = await userService.findValidSession('session-123');

			expect(mockDb.select).toHaveBeenCalled();
			expect(result).toEqual(mockSession);
		});

		it('should return null when session not found', async () => {
			mockDb.where.mockResolvedValue([]);

			const result = await userService.findValidSession('non-existent');

			expect(result).toBeNull();
		});
	});

	describe('cleanupExpiredSessions', () => {
		it('should delete expired sessions', async () => {
			mockDb.where.mockResolvedValue(undefined);

			await userService.cleanupExpiredSessions();

			expect(mockDb.delete).toHaveBeenCalled();
			expect(mockDb.where).toHaveBeenCalled();
		});
	});
});
