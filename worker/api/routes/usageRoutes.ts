import { UsageController } from '../controllers/usage/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup usage tracking routes
 */
export function setupUsageRoutes(app: Hono<AppEnv>): void {
  // Get current usage
  app.get(
    '/api/usage/current',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(UsageController, UsageController.getCurrentUsage)
  );

  // Get usage history
  app.get(
    '/api/usage/history',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(UsageController, UsageController.getUsageHistory)
  );

  // Export usage report
  app.post(
    '/api/usage/export',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(UsageController, UsageController.exportUsage)
  );
}
