/**
 * Cache Monitor - Tracks cache performance metrics
 *
 * Monitors cache hit/miss rates, response times, and provides statistics
 * for performance analysis and optimization.
 */

import { createLogger } from '../../logger';

const logger = createLogger('CacheMonitor');

export interface CacheMetric {
    endpoint: string;
    hitOrMiss: 'hit' | 'miss';
    responseTimeMs: number;
    timestamp: number;
    cacheKey: string;
}

export interface CacheStatistics {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    avgResponseTimeHit: number;
    avgResponseTimeMiss: number;
    byEndpoint: Record<string, {
        requests: number;
        hits: number;
        misses: number;
        hitRate: number;
    }>;
}

/**
 * Simple in-memory cache monitor
 * Uses ring buffer to prevent unbounded memory growth
 */
export class CacheMonitor {
    private metrics: CacheMetric[] = [];
    private readonly maxMetrics = 10000; // Keep last 10k metrics

    /**
     * Record a cache hit
     */
    recordHit(endpoint: string, responseTimeMs: number, cacheKey: string): void {
        this.addMetric({
            endpoint,
            hitOrMiss: 'hit',
            responseTimeMs,
            timestamp: Date.now(),
            cacheKey
        });
    }

    /**
     * Record a cache miss
     */
    recordMiss(endpoint: string, responseTimeMs: number, cacheKey: string): void {
        this.addMetric({
            endpoint,
            hitOrMiss: 'miss',
            responseTimeMs,
            timestamp: Date.now(),
            cacheKey
        });
    }

    /**
     * Add metric to ring buffer
     */
    private addMetric(metric: CacheMetric): void {
        this.metrics.push(metric);

        // Ring buffer: Remove oldest if exceeds max
        if (this.metrics.length > this.maxMetrics) {
            this.metrics.shift();
        }

        // Log every 100th metric for monitoring
        if (this.metrics.length % 100 === 0) {
            const stats = this.getStatistics();
            logger.debug('Cache performance snapshot', {
                totalRequests: stats.totalRequests,
                hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
                avgHitTime: `${stats.avgResponseTimeHit.toFixed(2)}ms`,
                avgMissTime: `${stats.avgResponseTimeMiss.toFixed(2)}ms`
            });
        }
    }

    /**
     * Get comprehensive cache statistics
     */
    getStatistics(sinceMinutes?: number): CacheStatistics {
        let metricsToAnalyze = this.metrics;

        // Filter by time window if specified
        if (sinceMinutes) {
            const cutoffTime = Date.now() - (sinceMinutes * 60 * 1000);
            metricsToAnalyze = this.metrics.filter(m => m.timestamp >= cutoffTime);
        }

        if (metricsToAnalyze.length === 0) {
            return {
                totalRequests: 0,
                cacheHits: 0,
                cacheMisses: 0,
                hitRate: 0,
                avgResponseTimeHit: 0,
                avgResponseTimeMiss: 0,
                byEndpoint: {}
            };
        }

        const hits = metricsToAnalyze.filter(m => m.hitOrMiss === 'hit');
        const misses = metricsToAnalyze.filter(m => m.hitOrMiss === 'miss');

        const avgResponseTimeHit = hits.length > 0
            ? hits.reduce((sum, m) => sum + m.responseTimeMs, 0) / hits.length
            : 0;

        const avgResponseTimeMiss = misses.length > 0
            ? misses.reduce((sum, m) => sum + m.responseTimeMs, 0) / misses.length
            : 0;

        // Group by endpoint
        const byEndpoint: Record<string, {
            requests: number;
            hits: number;
            misses: number;
            hitRate: number;
        }> = {};

        metricsToAnalyze.forEach(metric => {
            if (!byEndpoint[metric.endpoint]) {
                byEndpoint[metric.endpoint] = {
                    requests: 0,
                    hits: 0,
                    misses: 0,
                    hitRate: 0
                };
            }

            byEndpoint[metric.endpoint].requests++;
            if (metric.hitOrMiss === 'hit') {
                byEndpoint[metric.endpoint].hits++;
            } else {
                byEndpoint[metric.endpoint].misses++;
            }
        });

        // Calculate hit rates per endpoint
        Object.keys(byEndpoint).forEach(endpoint => {
            const stats = byEndpoint[endpoint];
            stats.hitRate = stats.requests > 0 ? stats.hits / stats.requests : 0;
        });

        return {
            totalRequests: metricsToAnalyze.length,
            cacheHits: hits.length,
            cacheMisses: misses.length,
            hitRate: metricsToAnalyze.length > 0 ? hits.length / metricsToAnalyze.length : 0,
            avgResponseTimeHit,
            avgResponseTimeMiss,
            byEndpoint
        };
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
        logger.info('Cache metrics cleared');
    }

    /**
     * Get recent metrics
     */
    getRecentMetrics(count: number = 100): CacheMetric[] {
        return this.metrics.slice(-count);
    }
}

// Global singleton instance
let globalMonitor: CacheMonitor | undefined;

/**
 * Get or create global cache monitor instance
 */
export function getCacheMonitor(): CacheMonitor {
    if (!globalMonitor) {
        globalMonitor = new CacheMonitor();
    }
    return globalMonitor;
}
