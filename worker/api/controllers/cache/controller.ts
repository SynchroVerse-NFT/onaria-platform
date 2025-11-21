/**
 * Cache Statistics Controller
 * Provides monitoring and statistics for the caching layer
 */

import { BaseController } from '../baseController';
import { RouteContext } from '../../types/route-context';
import { ApiResponse, ControllerResponse } from '../types';
import { getCacheMonitor } from '../../../services/cache/CacheMonitor';
import { createLogger } from '../../../logger';
import { CacheStatsData } from './types';

export class CacheController extends BaseController {
    static logger = createLogger('CacheController');

    /**
     * Get cache statistics
     * GET /api/cache/stats
     */
    static async getCacheStats(
        request: Request,
        _env: Env,
        _ctx: ExecutionContext,
        _context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<CacheStatsData>>> {
        try {
            const url = new URL(request.url);
            const sinceMinutesParam = url.searchParams.get('since');
            const sinceMinutes = sinceMinutesParam ? parseInt(sinceMinutesParam) : undefined;

            const monitor = getCacheMonitor();
            const stats = monitor.getStatistics(sinceMinutes);

            // Calculate performance improvement metrics
            const avgTimeSaved = stats.avgResponseTimeMiss - stats.avgResponseTimeHit;
            const totalTimeSaved = avgTimeSaved * stats.cacheHits;

            const responseData: CacheStatsData = {
                summary: {
                    totalRequests: stats.totalRequests,
                    cacheHits: stats.cacheHits,
                    cacheMisses: stats.cacheMisses,
                    hitRate: Number((stats.hitRate * 100).toFixed(2)),
                    avgResponseTimeHit: Number(stats.avgResponseTimeHit.toFixed(2)),
                    avgResponseTimeMiss: Number(stats.avgResponseTimeMiss.toFixed(2)),
                    avgTimeSavedPerHit: Number(avgTimeSaved.toFixed(2)),
                    totalTimeSavedMs: Number(totalTimeSaved.toFixed(2))
                },
                byEndpoint: Object.entries(stats.byEndpoint).map(([endpoint, data]) => ({
                    endpoint,
                    requests: data.requests,
                    hits: data.hits,
                    misses: data.misses,
                    hitRate: Number((data.hitRate * 100).toFixed(2))
                })).sort((a, b) => b.requests - a.requests), // Sort by request count
                period: sinceMinutes ? `Last ${sinceMinutes} minutes` : 'All time'
            };

            this.logger.info('Cache statistics retrieved', {
                totalRequests: stats.totalRequests,
                hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
                period: responseData.period
            });

            return CacheController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error fetching cache statistics:', error);
            return CacheController.createErrorResponse<CacheStatsData>(
                'Failed to fetch cache statistics',
                500
            );
        }
    }

    /**
     * Get recent cache metrics
     * GET /api/cache/metrics
     */
    static async getRecentMetrics(
        request: Request,
        _env: Env,
        _ctx: ExecutionContext,
        _context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<{ metrics: unknown[] }>>> {
        try {
            const url = new URL(request.url);
            const countParam = url.searchParams.get('count');
            const count = countParam ? parseInt(countParam) : 100;

            const monitor = getCacheMonitor();
            const metrics = monitor.getRecentMetrics(Math.min(count, 1000)); // Max 1000

            this.logger.debug('Recent cache metrics retrieved', { count: metrics.length });

            return CacheController.createSuccessResponse({ metrics });
        } catch (error) {
            this.logger.error('Error fetching recent metrics:', error);
            return CacheController.createErrorResponse<{ metrics: unknown[] }>(
                'Failed to fetch recent metrics',
                500
            );
        }
    }

    /**
     * Clear cache statistics
     * POST /api/cache/clear-stats
     * Admin only - should be protected by auth middleware
     */
    static async clearStats(
        _request: Request,
        _env: Env,
        _ctx: ExecutionContext,
        _context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<{ message: string }>>> {
        try {
            const monitor = getCacheMonitor();
            monitor.clear();

            this.logger.info('Cache statistics cleared');

            return CacheController.createSuccessResponse({
                message: 'Cache statistics cleared successfully'
            });
        } catch (error) {
            this.logger.error('Error clearing cache statistics:', error);
            return CacheController.createErrorResponse<{ message: string }>(
                'Failed to clear cache statistics',
                500
            );
        }
    }
}
