import { FeaturesController } from '../controllers/features/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup feature access routes
 */
export function setupFeatureRoutes(app: Hono<AppEnv>): void {
  // Get available features
  app.get(
    '/api/features',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(FeaturesController, FeaturesController.getAvailableFeatures)
  );

  // Check specific feature access
  app.get(
    '/api/features/:featureName/check',
    setAuthLevel(AuthConfig.authenticated),
    adaptController(FeaturesController, FeaturesController.checkFeatureAccess)
  );
}
