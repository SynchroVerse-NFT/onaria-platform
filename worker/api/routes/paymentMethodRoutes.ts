import { PaymentMethodController } from '../controllers/payment-methods/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup payment method routes
 */
export function setupPaymentMethodRoutes(app: Hono<AppEnv>): void {
  // Get all payment methods
  app.get(
    '/api/payment-methods',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentMethodController, PaymentMethodController.getPaymentMethods)
  );

  // Create payment method
  app.post(
    '/api/payment-methods',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentMethodController, PaymentMethodController.createPaymentMethod)
  );

  // Set default payment method
  app.put(
    '/api/payment-methods/:id/default',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentMethodController, PaymentMethodController.setDefaultPaymentMethod)
  );

  // Delete payment method
  app.delete(
    '/api/payment-methods/:id',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentMethodController, PaymentMethodController.deletePaymentMethod)
  );
}
