import { BillingController } from '../controllers/billing/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup billing routes
 */
export function setupBillingRoutes(app: Hono<AppEnv>): void {
  // Get billing history
  app.get(
    '/api/billing/history',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(BillingController, BillingController.getBillingHistory)
  );

  // Get specific invoice
  app.get(
    '/api/billing/invoice/:id',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(BillingController, BillingController.getInvoice)
  );

  // Get next billing
  app.get(
    '/api/billing/next',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(BillingController, BillingController.getNextBilling)
  );
}
