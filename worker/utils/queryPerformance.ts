/**
 * Query Performance Monitoring Utility
 *
 * Provides utilities for tracking database query performance and identifying slow queries.
 * Includes automatic logging for queries that exceed performance thresholds.
 */

import { createLogger } from '../logger';

const logger = createLogger('QueryPerformance');

export interface QueryMetrics {
    name: string;
    duration: number;
    timestamp: Date;
    context?: Record<string, unknown>;
}

export interface PerformanceThresholds {
    warning: number;  // Log warning if query exceeds this (ms)
    error: number;    // Log error if query exceeds this (ms)
}

// Default thresholds (can be overridden per query)
const DEFAULT_THRESHOLDS: PerformanceThresholds = {
    warning: 100,  // 100ms
    error: 500,    // 500ms
};

// Store query metrics in memory (limited size, circular buffer)
const MAX_METRICS_HISTORY = 100;
const queryMetricsHistory: QueryMetrics[] = [];

/**
 * Track execution time of a database query with automatic logging
 *
 * @param name - Human-readable name for the query
 * @param query - Promise to execute and track
 * @param options - Optional configuration
 * @returns Result of the query
 *
 * @example
 * ```typescript
 * const users = await trackQuery('getUsersByRole',
 *   db.select().from(users).where(eq(users.role, 'admin')),
 *   { context: { role: 'admin' } }
 * );
 * ```
 */
export async function trackQuery<T>(
    name: string,
    query: Promise<T>,
    options?: {
        thresholds?: Partial<PerformanceThresholds>;
        context?: Record<string, unknown>;
        silent?: boolean; // Disable logging (for testing)
    }
): Promise<T> {
    const start = performance.now();
    const thresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds };

    try {
        const result = await query;
        const duration = performance.now() - start;

        // Record metrics
        recordQueryMetric({
            name,
            duration,
            timestamp: new Date(),
            context: options?.context,
        });

        // Log based on thresholds
        if (!options?.silent) {
            if (duration >= thresholds.error) {
                logger.error(`CRITICAL: Slow query detected: ${name}`, {
                    duration: `${duration.toFixed(2)}ms`,
                    threshold: `${thresholds.error}ms`,
                    ...options?.context,
                });
            } else if (duration >= thresholds.warning) {
                logger.warn(`Slow query: ${name}`, {
                    duration: `${duration.toFixed(2)}ms`,
                    threshold: `${thresholds.warning}ms`,
                    ...options?.context,
                });
            } else {
                logger.debug(`Query executed: ${name}`, {
                    duration: `${duration.toFixed(2)}ms`,
                    ...options?.context,
                });
            }
        }

        return result;
    } catch (error) {
        const duration = performance.now() - start;

        logger.error(`Query failed: ${name}`, {
            duration: `${duration.toFixed(2)}ms`,
            error: error instanceof Error ? error.message : String(error),
            ...options?.context,
        });

        throw error;
    }
}

/**
 * Track a batch of queries executed in parallel
 *
 * @param name - Base name for the batch operation
 * @param queries - Array of named query promises
 * @returns Results array matching input order
 *
 * @example
 * ```typescript
 * const [users, apps, stats] = await trackBatchQuery('loadDashboard', [
 *   { name: 'users', query: db.select().from(users) },
 *   { name: 'apps', query: db.select().from(apps) },
 *   { name: 'stats', query: getStats() }
 * ]);
 * ```
 */
export async function trackBatchQuery<T extends unknown[]>(
    name: string,
    queries: Array<{ name: string; query: Promise<unknown> }>,
    options?: {
        thresholds?: Partial<PerformanceThresholds>;
        context?: Record<string, unknown>;
    }
): Promise<T> {
    const start = performance.now();
    const thresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds };

    try {
        // Execute all queries in parallel
        const results = await Promise.all(
            queries.map(({ query }) => query)
        );

        const totalDuration = performance.now() - start;

        // Log batch execution
        if (totalDuration >= thresholds.error) {
            logger.error(`CRITICAL: Slow batch query: ${name}`, {
                duration: `${totalDuration.toFixed(2)}ms`,
                queryCount: queries.length,
                queries: queries.map(q => q.name),
                ...options?.context,
            });
        } else if (totalDuration >= thresholds.warning) {
            logger.warn(`Slow batch query: ${name}`, {
                duration: `${totalDuration.toFixed(2)}ms`,
                queryCount: queries.length,
                queries: queries.map(q => q.name),
                ...options?.context,
            });
        } else {
            logger.debug(`Batch query executed: ${name}`, {
                duration: `${totalDuration.toFixed(2)}ms`,
                queryCount: queries.length,
                ...options?.context,
            });
        }

        // Record individual metrics
        recordQueryMetric({
            name: `${name} (batch)`,
            duration: totalDuration,
            timestamp: new Date(),
            context: {
                queryCount: queries.length,
                queries: queries.map(q => q.name),
                ...options?.context,
            },
        });

        return results as T;
    } catch (error) {
        const duration = performance.now() - start;

        logger.error(`Batch query failed: ${name}`, {
            duration: `${duration.toFixed(2)}ms`,
            queryCount: queries.length,
            error: error instanceof Error ? error.message : String(error),
            ...options?.context,
        });

        throw error;
    }
}

/**
 * Record query metric in history (circular buffer)
 */
function recordQueryMetric(metric: QueryMetrics): void {
    queryMetricsHistory.push(metric);

    // Keep only the last MAX_METRICS_HISTORY entries
    if (queryMetricsHistory.length > MAX_METRICS_HISTORY) {
        queryMetricsHistory.shift();
    }
}

/**
 * Get query performance statistics
 *
 * @param options - Optional filter options
 * @returns Aggregated performance statistics
 */
export function getQueryStats(options?: {
    sinceMinutes?: number;
    queryName?: string;
}): {
    totalQueries: number;
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    p50Duration: number;
    p95Duration: number;
    p99Duration: number;
    slowQueries: QueryMetrics[];
} {
    let filteredMetrics = [...queryMetricsHistory];

    // Filter by time
    if (options?.sinceMinutes) {
        const cutoff = new Date(Date.now() - options.sinceMinutes * 60 * 1000);
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= cutoff);
    }

    // Filter by query name
    if (options?.queryName) {
        filteredMetrics = filteredMetrics.filter(m => m.name.includes(options.queryName!));
    }

    if (filteredMetrics.length === 0) {
        return {
            totalQueries: 0,
            averageDuration: 0,
            maxDuration: 0,
            minDuration: 0,
            p50Duration: 0,
            p95Duration: 0,
            p99Duration: 0,
            slowQueries: [],
        };
    }

    // Sort by duration for percentile calculations
    const sortedDurations = filteredMetrics
        .map(m => m.duration)
        .sort((a, b) => a - b);

    const totalQueries = filteredMetrics.length;
    const sum = sortedDurations.reduce((acc, d) => acc + d, 0);
    const averageDuration = sum / totalQueries;

    // Percentile calculations
    const p50Index = Math.floor(totalQueries * 0.5);
    const p95Index = Math.floor(totalQueries * 0.95);
    const p99Index = Math.floor(totalQueries * 0.99);

    // Find slow queries (>100ms)
    const slowQueries = filteredMetrics
        .filter(m => m.duration >= DEFAULT_THRESHOLDS.warning)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10); // Top 10 slowest

    return {
        totalQueries,
        averageDuration: Number(averageDuration.toFixed(2)),
        maxDuration: sortedDurations[totalQueries - 1],
        minDuration: sortedDurations[0],
        p50Duration: sortedDurations[p50Index],
        p95Duration: sortedDurations[p95Index],
        p99Duration: sortedDurations[p99Index],
        slowQueries,
    };
}

/**
 * Clear query metrics history
 * Useful for testing or resetting metrics
 */
export function clearQueryMetrics(): void {
    queryMetricsHistory.length = 0;
}

/**
 * Get raw query metrics history
 *
 * @param limit - Maximum number of recent metrics to return
 * @returns Array of query metrics
 */
export function getQueryHistory(limit: number = 50): QueryMetrics[] {
    return queryMetricsHistory.slice(-limit);
}

/**
 * Helper to measure execution time of any operation
 *
 * @param name - Operation name
 * @param operation - Function to execute
 * @returns Result of the operation
 *
 * @example
 * ```typescript
 * const result = await measureTime('processData', async () => {
 *   return await heavyComputation();
 * });
 * ```
 */
export async function measureTime<T>(
    name: string,
    operation: () => Promise<T>,
    options?: {
        logResult?: boolean;
        context?: Record<string, unknown>;
    }
): Promise<T> {
    const start = performance.now();

    try {
        const result = await operation();
        const duration = performance.now() - start;

        if (options?.logResult !== false) {
            logger.debug(`Operation completed: ${name}`, {
                duration: `${duration.toFixed(2)}ms`,
                ...options?.context,
            });
        }

        return result;
    } catch (error) {
        const duration = performance.now() - start;

        logger.error(`Operation failed: ${name}`, {
            duration: `${duration.toFixed(2)}ms`,
            error: error instanceof Error ? error.message : String(error),
            ...options?.context,
        });

        throw error;
    }
}
