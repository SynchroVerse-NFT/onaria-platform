/**
 * Webhook Routes
 * API routes for webhook management
 */

import { WebhooksController } from '../controllers/webhooks/controller';
import { WebhookEventsController } from '../controllers/webhooks/events/controller';
import { Hono } from 'hono';
import { AppEnv } from '../../types/appenv';
import { adaptController } from '../honoAdapter';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

/**
 * Setup webhook-related routes
 */
export function setupWebhookRoutes(app: Hono<AppEnv>): void {
    // Create a sub-router for webhook routes
    const webhooksRouter = new Hono<AppEnv>();

    // Webhook CRUD operations
    webhooksRouter.post('/', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.createWebhook));
    webhooksRouter.get('/', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.getWebhooks));
    webhooksRouter.get('/:webhookId', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.getWebhook));
    webhooksRouter.put('/:webhookId', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.updateWebhook));
    webhooksRouter.delete('/:webhookId', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.deleteWebhook));

    // Webhook operations
    webhooksRouter.post('/:webhookId/test', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.testWebhook));
    webhooksRouter.post('/:webhookId/regenerate-secret', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.regenerateSecret));
    webhooksRouter.get('/:webhookId/logs', setAuthLevel(AuthConfig.authenticated), adaptController(WebhooksController, WebhooksController.getWebhookLogs));

    // Internal event emission endpoint
    // NOTE: This endpoint should be protected with internal auth or rate limiting
    webhooksRouter.post('/events/emit', setAuthLevel(AuthConfig.authenticated), adaptController(WebhookEventsController, WebhookEventsController.emitEvent));

    // Test event emission endpoint (for development and testing)
    webhooksRouter.post('/events/test', setAuthLevel(AuthConfig.authenticated), adaptController(WebhookEventsController, WebhookEventsController.testEvent));

    // Mount the router under /api/webhooks
    app.route('/api/webhooks', webhooksRouter);
}
