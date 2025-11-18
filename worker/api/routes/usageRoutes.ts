/**
 * Usage Routes
 * API routes for LLM usage and cost tracking
 */

import { UsageController } from '../controllers/usage/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup usage/cost tracking routes
 */
export function setupUsageRoutes(app: Hono<AppEnv>): void {
    // Get user usage statistics
    app.get('/api/usage/stats', setAuthLevel(AuthConfig.authenticated), adaptController(UsageController, UsageController.getUserUsageStats));

    // Get app usage statistics
    app.get('/api/usage/app/:appId', setAuthLevel(AuthConfig.authenticated), adaptController(UsageController, UsageController.getAppUsageStats));

    // Get total cost
    app.get('/api/usage/total-cost', setAuthLevel(AuthConfig.authenticated), adaptController(UsageController, UsageController.getTotalCost));

    // Get recent usage records
    app.get('/api/usage/recent', setAuthLevel(AuthConfig.authenticated), adaptController(UsageController, UsageController.getRecentUsage));
}
