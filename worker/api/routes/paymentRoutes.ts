import { PaymentController } from '../controllers/payments/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup payment routes
 */
export function setupPaymentRoutes(app: Hono<AppEnv>): void {
  // Initiate crypto payment
  app.post(
    '/api/payments/crypto/initiate',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentController, PaymentController.initiateCryptoPayment)
  );

  // Verify crypto payment
  app.post(
    '/api/payments/crypto/verify',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentController, PaymentController.verifyCryptoPayment)
  );

  // Get payment history
  app.get(
    '/api/payments/history',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentController, PaymentController.getPaymentHistory)
  );

  // Get specific payment
  app.get(
    '/api/payments/:id',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentController, PaymentController.getPaymentDetails)
  );

  // Crypto webhook (internal)
  app.post(
    '/api/payments/crypto/webhook',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(PaymentController, PaymentController.cryptoWebhook)
  );
}
