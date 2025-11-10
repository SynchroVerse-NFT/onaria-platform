import { SubscriptionController } from '../controllers/subscriptions/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup subscription management routes
 */
export function setupSubscriptionRoutes(app: Hono<AppEnv>): void {
  // Get current subscription
  app.get(
    '/api/subscriptions/current',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(SubscriptionController, SubscriptionController.getCurrentSubscription)
  );

  // Upgrade subscription
  app.post(
    '/api/subscriptions/upgrade',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(SubscriptionController, SubscriptionController.upgradeSubscription)
  );

  // Downgrade subscription
  app.post(
    '/api/subscriptions/downgrade',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(SubscriptionController, SubscriptionController.downgradeSubscription)
  );

  // Cancel subscription
  app.post(
    '/api/subscriptions/cancel',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(SubscriptionController, SubscriptionController.cancelSubscription)
  );

  // Reactivate subscription
  app.post(
    '/api/subscriptions/reactivate',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(SubscriptionController, SubscriptionController.reactivateSubscription)
  );
}
