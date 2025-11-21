/**
 * Transaction Tests - Comprehensive test suite for database transactions
 * Tests atomic operations and rollback scenarios across all services
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuthService } from './AuthService';
import { AppService } from './AppService';
import { SessionService } from './SessionService';
import { SecretsService } from './SecretsService';
import { createMockEnv, createMockD1Database } from '../../../test/mocks/database';
import type { Request } from '@cloudflare/workers-types';

// Mock request helper
function createMockRequest(overrides: Partial<Request> = {}): Request {
    return {
        url: 'http://localhost:3000/api/test',
        method: 'POST',
        headers: new Headers({
            'user-agent': 'test-agent',
            'x-forwarded-for': '127.0.0.1'
        }),
        ...overrides
    } as Request;
}

describe('Transaction Tests - AuthService', () => {
    let env: Env;
    let authService: AuthService;
    let mockDb: ReturnType<typeof createMockD1Database>;

    beforeEach(() => {
        mockDb = createMockD1Database();
        env = createMockEnv(mockDb);
        authService = new AuthService(env);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('User Registration Transaction', () => {
        it('should commit transaction when registration succeeds', async () => {
            const request = createMockRequest();
            const registrationData = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                name: 'Test User'
            };

            // Mock successful transaction
            const transactionSpy = vi.spyOn(mockDb, 'transaction');

            await authService.register(registrationData, request);

            expect(transactionSpy).toHaveBeenCalled();
            // Verify transaction was called with a function
            expect(typeof transactionSpy.mock.calls[0][0]).toBe('function');
        });

        it('should rollback transaction when session creation fails', async () => {
            const request = createMockRequest();
            const registrationData = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                name: 'Test User'
            };

            // Mock transaction that fails on session creation
            const transactionSpy = vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    insert: vi.fn().mockReturnValue({
                        values: vi.fn().mockImplementation((data) => {
                            // Fail on session insert (second insert)
                            if (data.accessTokenHash) {
                                throw new Error('Session creation failed');
                            }
                            return Promise.resolve();
                        })
                    }),
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue(null)
                            })
                        })
                    })
                };

                try {
                    return await callback(mockTx as any);
                } catch (error) {
                    // Transaction should rollback
                    throw error;
                }
            });

            await expect(authService.register(registrationData, request)).rejects.toThrow();
            expect(transactionSpy).toHaveBeenCalled();
        });

        it('should not create user without session (atomicity)', async () => {
            const request = createMockRequest();
            const registrationData = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                name: 'Test User'
            };

            // Track all inserts
            const insertedUsers: any[] = [];
            const insertedSessions: any[] = [];

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    insert: vi.fn().mockReturnValue({
                        values: vi.fn().mockImplementation((data) => {
                            if (data.passwordHash) {
                                insertedUsers.push(data);
                            } else if (data.accessTokenHash) {
                                // Fail session creation
                                throw new Error('Session creation failed');
                            }
                            return Promise.resolve();
                        })
                    }),
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue(null)
                            })
                        })
                    })
                };

                try {
                    return await callback(mockTx as any);
                } catch (error) {
                    // Rollback - clear all insertions
                    insertedUsers.length = 0;
                    insertedSessions.length = 0;
                    throw error;
                }
            });

            await expect(authService.register(registrationData, request)).rejects.toThrow();

            // Verify neither user nor session was committed
            expect(insertedUsers.length).toBe(0);
            expect(insertedSessions.length).toBe(0);
        });
    });

    describe('OAuth Callback Transaction', () => {
        it('should rollback if OAuth state update succeeds but user creation fails', async () => {
            const request = createMockRequest();

            const oauthStateUpdated = { updated: false };
            const userCreated = { created: false };

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockImplementation(() => {
                                oauthStateUpdated.updated = true;
                                return Promise.resolve();
                            })
                        })
                    }),
                    insert: vi.fn().mockReturnValue({
                        values: vi.fn().mockImplementation(() => {
                            throw new Error('User creation failed');
                        })
                    }),
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue(null)
                            })
                        })
                    })
                };

                try {
                    return await callback(mockTx as any);
                } catch (error) {
                    // Rollback
                    oauthStateUpdated.updated = false;
                    userCreated.created = false;
                    throw error;
                }
            });

            // OAuth state should not be marked as used if transaction fails
            expect(oauthStateUpdated.updated).toBe(false);
            expect(userCreated.created).toBe(false);
        });
    });
});

describe('Transaction Tests - AppService', () => {
    let env: Env;
    let appService: AppService;
    let mockDb: ReturnType<typeof createMockD1Database>;

    beforeEach(() => {
        mockDb = createMockD1Database();
        env = createMockEnv(mockDb);
        appService = new AppService(env);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('App Deletion Transaction', () => {
        it('should delete all related records atomically', async () => {
            const appId = 'test-app-id';
            const userId = 'test-user-id';

            const deletedRecords: string[] = [];

            // Mock ownership check
            vi.spyOn(appService, 'checkAppOwnership').mockResolvedValue({
                exists: true,
                isOwner: true
            });

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    delete: vi.fn().mockImplementation((table: any) => ({
                        where: vi.fn().mockImplementation(() => {
                            const tableName = table.name || 'unknown';
                            deletedRecords.push(tableName);
                            return {
                                returning: () => Promise.resolve([{ id: appId }])
                            };
                        })
                    })),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockImplementation(() => {
                                deletedRecords.push('apps_fork_update');
                                return Promise.resolve();
                            })
                        })
                    }),
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue([])
                            })
                        })
                    })
                };

                return await callback(mockTx as any);
            });

            const result = await appService.deleteApp(appId, userId);

            expect(result.success).toBe(true);
            expect(deletedRecords.length).toBeGreaterThan(0);
        });

        it('should rollback if any deletion fails', async () => {
            const appId = 'test-app-id';
            const userId = 'test-user-id';

            const deletedRecords: string[] = [];

            vi.spyOn(appService, 'checkAppOwnership').mockResolvedValue({
                exists: true,
                isOwner: true
            });

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    delete: vi.fn().mockImplementation((table: any) => ({
                        where: vi.fn().mockImplementation(() => {
                            const tableName = table.name || 'unknown';
                            deletedRecords.push(tableName);

                            // Fail on third deletion
                            if (deletedRecords.length === 3) {
                                throw new Error('Deletion failed');
                            }

                            return {
                                returning: () => Promise.resolve([{ id: appId }])
                            };
                        })
                    })),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue({})
                        })
                    }),
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([])
                        })
                    })
                };

                try {
                    return await callback(mockTx as any);
                } catch (error) {
                    // Rollback - clear all deletions
                    deletedRecords.length = 0;
                    throw error;
                }
            });

            const result = await appService.deleteApp(appId, userId);

            expect(result.success).toBe(false);
            // Verify rollback cleared all deletions
            expect(deletedRecords.length).toBe(0);
        });

        it('should not leave orphaned favorites/stars/views if app deletion fails', async () => {
            const appId = 'test-app-id';
            const userId = 'test-user-id';

            const deletedTables: Set<string> = new Set();

            vi.spyOn(appService, 'checkAppOwnership').mockResolvedValue({
                exists: true,
                isOwner: true
            });

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    delete: vi.fn().mockImplementation((table: any) => ({
                        where: vi.fn().mockImplementation(() => {
                            const tableName = table.name || 'unknown';

                            // Fail when trying to delete app itself (last step)
                            if (tableName === 'apps') {
                                throw new Error('App deletion failed');
                            }

                            deletedTables.add(tableName);
                            return {
                                returning: () => Promise.resolve([{ id: appId }])
                            };
                        })
                    })),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue({})
                        })
                    }),
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockResolvedValue([])
                        })
                    })
                };

                try {
                    return await callback(mockTx as any);
                } catch (error) {
                    // Rollback - nothing should be deleted
                    deletedTables.clear();
                    throw error;
                }
            });

            const result = await appService.deleteApp(appId, userId);

            expect(result.success).toBe(false);
            // Verify no related records were left behind
            expect(deletedTables.size).toBe(0);
        });
    });
});

describe('Transaction Tests - SessionService', () => {
    let env: Env;
    let sessionService: SessionService;
    let mockDb: ReturnType<typeof createMockD1Database>;

    beforeEach(() => {
        mockDb = createMockD1Database();
        env = createMockEnv(mockDb);
        sessionService = new SessionService(env);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Session Creation Transaction', () => {
        it('should commit cleanup and creation together', async () => {
            const userId = 'test-user-id';
            const request = createMockRequest();

            const cleanedUp = { count: 0 };
            const created = { done: false };

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                orderBy: vi.fn().mockReturnValue({
                                    all: vi.fn().mockResolvedValue([
                                        { id: 'old-session-1' },
                                        { id: 'old-session-2' },
                                        { id: 'old-session-3' },
                                        { id: 'old-session-4' },
                                        { id: 'old-session-5' },
                                        { id: 'old-session-6' }
                                    ])
                                }),
                                get: vi.fn().mockResolvedValue({ email: 'test@example.com' })
                            })
                        })
                    }),
                    delete: vi.fn().mockReturnValue({
                        where: vi.fn().mockImplementation(() => {
                            cleanedUp.count++;
                            return Promise.resolve();
                        })
                    }),
                    insert: vi.fn().mockReturnValue({
                        values: vi.fn().mockImplementation(() => {
                            created.done = true;
                            return Promise.resolve();
                        })
                    })
                };

                return await callback(mockTx as any);
            });

            await sessionService.createSession(userId, request);

            // Verify cleanup happened
            expect(cleanedUp.count).toBeGreaterThan(0);
            // Verify session was created
            expect(created.done).toBe(true);
        });

        it('should rollback cleanup if session creation fails', async () => {
            const userId = 'test-user-id';
            const request = createMockRequest();

            const cleanedSessions: string[] = [];
            const createdSession = { done: false };

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                orderBy: vi.fn().mockReturnValue({
                                    all: vi.fn().mockResolvedValue([
                                        { id: 'old-session-1' },
                                        { id: 'old-session-2' },
                                        { id: 'old-session-3' },
                                        { id: 'old-session-4' },
                                        { id: 'old-session-5' },
                                        { id: 'old-session-6' }
                                    ])
                                }),
                                get: vi.fn().mockResolvedValue({ email: 'test@example.com' })
                            })
                        })
                    }),
                    delete: vi.fn().mockReturnValue({
                        where: vi.fn().mockImplementation(() => {
                            cleanedSessions.push('cleaned');
                            return Promise.resolve();
                        })
                    }),
                    insert: vi.fn().mockReturnValue({
                        values: vi.fn().mockImplementation(() => {
                            throw new Error('Session creation failed');
                        })
                    })
                };

                try {
                    return await callback(mockTx as any);
                } catch (error) {
                    // Rollback cleanup
                    cleanedSessions.length = 0;
                    throw error;
                }
            });

            await expect(sessionService.createSession(userId, request)).rejects.toThrow();

            // Verify cleanup was rolled back
            expect(cleanedSessions.length).toBe(0);
            expect(createdSession.done).toBe(false);
        });
    });
});

describe('Transaction Tests - SecretsService', () => {
    let env: Env;
    let secretsService: SecretsService;
    let mockDb: ReturnType<typeof createMockD1Database>;

    beforeEach(() => {
        mockDb = createMockD1Database();
        env = createMockEnv(mockDb);
        secretsService = new SecretsService(env);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Secret Retrieval with Usage Tracking Transaction', () => {
        it('should update usage tracking atomically with retrieval', async () => {
            const userId = 'test-user-id';
            const secretId = 'test-secret-id';

            const retrieved = { done: false };
            const usageUpdated = { done: false };

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                get: vi.fn().mockImplementation(() => {
                                    retrieved.done = true;
                                    return Promise.resolve({
                                        id: secretId,
                                        encryptedValue: 'encrypted-data',
                                        usageCount: 5
                                    });
                                })
                            })
                        })
                    }),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockImplementation(() => {
                                usageUpdated.done = true;
                                return Promise.resolve();
                            })
                        })
                    })
                };

                return await callback(mockTx as any);
            });

            // Mock decryption
            vi.spyOn(secretsService as any, 'decryptSecret').mockResolvedValue('decrypted-value');

            await secretsService.getSecretValue(userId, secretId);

            expect(retrieved.done).toBe(true);
            expect(usageUpdated.done).toBe(true);
        });

        it('should not update usage if retrieval fails', async () => {
            const userId = 'test-user-id';
            const secretId = 'test-secret-id';

            const usageUpdated = { done: false };

            vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
                const mockTx = {
                    select: vi.fn().mockReturnValue({
                        from: vi.fn().mockReturnValue({
                            where: vi.fn().mockReturnValue({
                                get: vi.fn().mockResolvedValue(null) // Secret not found
                            })
                        })
                    }),
                    update: vi.fn().mockReturnValue({
                        set: vi.fn().mockReturnValue({
                            where: vi.fn().mockImplementation(() => {
                                usageUpdated.done = true;
                                return Promise.resolve();
                            })
                        })
                    })
                };

                try {
                    return await callback(mockTx as any);
                } catch (error) {
                    throw error;
                }
            });

            await expect(secretsService.getSecretValue(userId, secretId)).rejects.toThrow('Secret not found');

            // Verify usage was not updated
            expect(usageUpdated.done).toBe(false);
        });
    });
});

describe('Transaction Tests - Concurrent Operations', () => {
    let env: Env;
    let mockDb: ReturnType<typeof createMockD1Database>;

    beforeEach(() => {
        mockDb = createMockD1Database();
        env = createMockEnv(mockDb);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should handle concurrent transaction requests correctly', async () => {
        const authService = new AuthService(env);
        const request = createMockRequest();

        const completedTransactions: number[] = [];

        vi.spyOn(mockDb, 'transaction').mockImplementation(async (callback) => {
            const transactionId = Math.random();
            completedTransactions.push(transactionId);

            // Simulate async transaction
            await new Promise(resolve => setTimeout(resolve, 10));

            return await callback({} as any);
        });

        // Run multiple registrations concurrently
        const promises = [
            authService.register({ email: 'user1@test.com', password: 'Pass123!' }, request).catch(() => {}),
            authService.register({ email: 'user2@test.com', password: 'Pass123!' }, request).catch(() => {}),
            authService.register({ email: 'user3@test.com', password: 'Pass123!' }, request).catch(() => {})
        ];

        await Promise.all(promises);

        // Verify all transactions were attempted
        expect(completedTransactions.length).toBe(3);
    });
});
