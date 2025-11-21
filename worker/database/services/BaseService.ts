/**
 * Base Database Service Class
 * Provides common database functionality and patterns for all domain services
 */

import { createDatabaseService, DatabaseService } from '../database';
import { SQL, and } from 'drizzle-orm';
import { createLogger } from '../../logger';

/**
 * Base class for all database domain services
 * Provides shared utilities and database access patterns
 */
export abstract class BaseService {
    protected logger = createLogger(this.constructor.name);
    protected db: DatabaseService;
    // @ts-ignore - Env type exists at runtime from worker-configuration.d.ts
    protected env: Env;
    // @ts-ignore - Env type exists at runtime from worker-configuration.d.ts
    constructor(env: Env) {
        this.db = createDatabaseService(env);
        this.env = env;
    }

    /**
     * Helper to build type-safe where conditions
     */
    protected buildWhereConditions(conditions: (SQL<unknown> | undefined)[]): SQL<unknown> | undefined {
        const validConditions = conditions.filter((c): c is SQL<unknown> => c !== undefined);
        if (validConditions.length === 0) return undefined;
        if (validConditions.length === 1) return validConditions[0];
        // Use Drizzle's and() function to properly combine conditions
        return and(...validConditions);
    }

    /**
     * Standard error handling for database operations
     */
    protected handleDatabaseError(error: unknown, operation: string, context?: Record<string, unknown>): never {
        this.logger.error(`Database error in ${operation}`, { error, context });
        throw error;
    }

    /**
     * Get database connection for direct queries when needed
     */
    protected get database() {
        return this.db.db;
    }

    /**
     * Get read-optimized database connection using D1 read replicas
     * For read-only queries to reduce global latency
     *
     * @param strategy - 'fast' for lowest latency, 'fresh' for latest data
     */
    protected getReadDb(strategy: 'fast' | 'fresh' = 'fast') {
        return this.db.getReadDb(strategy);
    }

    /**
     * Execute a database transaction with standardized error handling
     *
     * Provides a clean abstraction for atomic multi-table operations.
     * Automatically rolls back on errors and logs transaction lifecycle.
     *
     * @param operation - Async function containing transactional operations
     * @param context - Context object for logging (operation name, IDs, etc.)
     * @returns Result of the transaction
     *
     * @example
     * ```typescript
     * await this.executeTransaction(async (tx) => {
     *   await tx.insert(schema.users).values(userData);
     *   await tx.insert(schema.sessions).values(sessionData);
     *   return userData;
     * }, { operation: 'user-registration', userId });
     * ```
     */
    protected async executeTransaction<T>(
        operation: (tx: ReturnType<typeof this.database.transaction>) => Promise<T>,
        context?: Record<string, unknown>
    ): Promise<T> {
        const startTime = Date.now();

        try {
            this.logger.debug('Transaction started', context);

            const result = await this.database.transaction(operation as any);

            const duration = Date.now() - startTime;
            this.logger.debug('Transaction committed', { ...context, duration });

            // @ts-expect-error - Transaction result type is correctly inferred but TypeScript can't verify through the any cast
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error('Transaction rolled back', {
                ...context,
                duration,
                error: error instanceof Error ? error.message : String(error)
            });

            throw error;
        }
    }
}