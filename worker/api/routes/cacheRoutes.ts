/**
 * Cache Statistics Routes
 * Endpoints for monitoring caching performance
 */

import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';
import { CacheController } from '../controllers/cache/controller';

/**
 * Setup cache statistics routes
 */
export function setupCacheRoutes(app: Hono<AppEnv>): void {
    const cacheRouter = new Hono<AppEnv>();

    // Get cache statistics - authenticated (users can monitor cache performance)
    cacheRouter.get('/stats', setAuthLevel(AuthConfig.authenticated), adaptController(CacheController, CacheController.getCacheStats));

    // Get recent metrics - authenticated
    cacheRouter.get('/metrics', setAuthLevel(AuthConfig.authenticated), adaptController(CacheController, CacheController.getRecentMetrics));

    // Clear statistics - authenticated (reset metrics for testing)
    cacheRouter.post('/clear-stats', setAuthLevel(AuthConfig.authenticated), adaptController(CacheController, CacheController.clearStats));

    // Mount the cache router under /api/cache
    app.route('/api/cache', cacheRouter);
}
