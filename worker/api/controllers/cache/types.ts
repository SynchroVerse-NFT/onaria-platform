/**
 * Cache Controller Types
 */

export interface CacheStatsData {
    summary: {
        totalRequests: number;
        cacheHits: number;
        cacheMisses: number;
        hitRate: number; // Percentage
        avgResponseTimeHit: number; // ms
        avgResponseTimeMiss: number; // ms
        avgTimeSavedPerHit: number; // ms
        totalTimeSavedMs: number; // ms
    };
    byEndpoint: Array<{
        endpoint: string;
        requests: number;
        hits: number;
        misses: number;
        hitRate: number; // Percentage
    }>;
    period: string;
}
