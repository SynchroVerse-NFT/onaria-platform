/**
 * Webhooks Controller
 * Handles API endpoints for webhook management
 *
 * NOTE: This controller depends on WebhookService from Agent 2.
 * Ensure Agent 2 implementation is complete before using these endpoints.
 */

import { BaseController } from '../baseController';
import { ApiResponse, ControllerResponse } from '../types';
import { RouteContext } from '../../types/route-context';
import type {
    WebhookCreateData,
    WebhooksListData,
    WebhookData,
    WebhookUpdateData,
    WebhookDeleteData,
    WebhookTestData,
    WebhookRegenerateSecretData,
    WebhookLogsData,
} from './types';
import type { WorkflowEventType } from '../../../../src/api-types';

export class WebhooksController extends BaseController {

    /**
     * Create a new webhook
     * POST /api/webhooks
     */
    static async createWebhook(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhookCreateData>>> {
        try {
            const user = context.user!;

            const bodyResult = await WebhooksController.parseJsonBody<{
                name: string;
                url: string;
                events: WorkflowEventType[];
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<WebhookCreateData>>;
            }

            const { name, url, events } = bodyResult.data!;

            // Validate required fields
            if (!name || !url || !events || !Array.isArray(events)) {
                return WebhooksController.createErrorResponse<WebhookCreateData>(
                    'Missing required fields: name, url, events',
                    400
                );
            }

            // Validate URL format
            try {
                new URL(url);
            } catch {
                return WebhooksController.createErrorResponse<WebhookCreateData>(
                    'Invalid webhook URL format',
                    400
                );
            }

            // Validate events array is not empty
            if (events.length === 0) {
                return WebhooksController.createErrorResponse<WebhookCreateData>(
                    'At least one event type must be specified',
                    400
                );
            }

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // const result = await webhookService.createWebhook(user.id, { name, url, events });

            // PLACEHOLDER: Return mock response until Agent 2 is complete
            const responseData: WebhookCreateData = {
                webhook: {
                    id: 'webhook_' + crypto.randomUUID(),
                    userId: user.id,
                    name,
                    url,
                    events,
                    isActive: true,
                    triggerCount: 0,
                    failureCount: 0,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
                secret: 'whsec_' + crypto.randomUUID().replace(/-/g, ''),
                message: 'Webhook created successfully. Save the secret - it will not be shown again.',
            };

            return WebhooksController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error creating webhook:', error);
            return WebhooksController.createErrorResponse<WebhookCreateData>(
                'Failed to create webhook',
                500
            );
        }
    }

    /**
     * List user's webhooks
     * GET /api/webhooks?isActive=true
     */
    static async getWebhooks(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhooksListData>>> {
        try {
            const user = context.user!;
            const url = new URL(request.url);
            const isActiveParam = url.searchParams.get('isActive');
            const isActive = isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : undefined;

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // const webhooks = await webhookService.getUserWebhooks(user.id, isActive);

            // PLACEHOLDER: Return mock response until Agent 2 is complete
            const responseData: WebhooksListData = {
                webhooks: [],
            };

            return WebhooksController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error getting webhooks:', error);
            return WebhooksController.createErrorResponse<WebhooksListData>(
                'Failed to get webhooks',
                500
            );
        }
    }

    /**
     * Get specific webhook (without secret)
     * GET /api/webhooks/:id
     */
    static async getWebhook(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhookData>>> {
        try {
            const user = context.user!;
            const webhookId = context.pathParams.webhookId;

            if (!webhookId) {
                return WebhooksController.createErrorResponse<WebhookData>(
                    'Webhook ID is required',
                    400
                );
            }

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // const webhook = await webhookService.getWebhook(user.id, webhookId);

            // if (!webhook) {
            //     return WebhooksController.createErrorResponse<WebhookData>(
            //         'Webhook not found',
            //         404
            //     );
            // }

            // PLACEHOLDER: Return mock response until Agent 2 is complete
            return WebhooksController.createErrorResponse<WebhookData>(
                'Webhook not found',
                404
            );
        } catch (error) {
            this.logger.error('Error getting webhook:', error);
            return WebhooksController.createErrorResponse<WebhookData>(
                'Failed to get webhook',
                500
            );
        }
    }

    /**
     * Update webhook
     * PUT /api/webhooks/:id
     */
    static async updateWebhook(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhookUpdateData>>> {
        try {
            const user = context.user!;
            const webhookId = context.pathParams.webhookId;

            if (!webhookId) {
                return WebhooksController.createErrorResponse<WebhookUpdateData>(
                    'Webhook ID is required',
                    400
                );
            }

            const bodyResult = await WebhooksController.parseJsonBody<{
                name?: string;
                url?: string;
                events?: WorkflowEventType[];
                isActive?: boolean;
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<WebhookUpdateData>>;
            }

            const updates = bodyResult.data!;

            // Validate URL if provided
            if (updates.url) {
                try {
                    new URL(updates.url);
                } catch {
                    return WebhooksController.createErrorResponse<WebhookUpdateData>(
                        'Invalid webhook URL format',
                        400
                    );
                }
            }

            // Validate events array if provided
            if (updates.events && (!Array.isArray(updates.events) || updates.events.length === 0)) {
                return WebhooksController.createErrorResponse<WebhookUpdateData>(
                    'Events must be a non-empty array',
                    400
                );
            }

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // const webhook = await webhookService.updateWebhook(user.id, webhookId, updates);

            // PLACEHOLDER: Return mock response until Agent 2 is complete
            return WebhooksController.createErrorResponse<WebhookUpdateData>(
                'Webhook not found',
                404
            );
        } catch (error) {
            this.logger.error('Error updating webhook:', error);
            return WebhooksController.createErrorResponse<WebhookUpdateData>(
                'Failed to update webhook',
                500
            );
        }
    }

    /**
     * Delete webhook and associated workflow instances
     * DELETE /api/webhooks/:id
     */
    static async deleteWebhook(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhookDeleteData>>> {
        try {
            const user = context.user!;
            const webhookId = context.pathParams.webhookId;

            if (!webhookId) {
                return WebhooksController.createErrorResponse<WebhookDeleteData>(
                    'Webhook ID is required',
                    400
                );
            }

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // await webhookService.deleteWebhook(user.id, webhookId);

            const responseData: WebhookDeleteData = {
                success: true,
                message: 'Webhook deleted successfully',
            };

            return WebhooksController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error deleting webhook:', error);
            return WebhooksController.createErrorResponse<WebhookDeleteData>(
                'Failed to delete webhook',
                500
            );
        }
    }

    /**
     * Send test webhook
     * POST /api/webhooks/:id/test
     */
    static async testWebhook(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhookTestData>>> {
        try {
            const user = context.user!;
            const webhookId = context.pathParams.webhookId;

            if (!webhookId) {
                return WebhooksController.createErrorResponse<WebhookTestData>(
                    'Webhook ID is required',
                    400
                );
            }

            const bodyResult = await WebhooksController.parseJsonBody<{
                payload?: Record<string, unknown>;
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<WebhookTestData>>;
            }

            const { payload } = bodyResult.data!;

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // const result = await webhookService.testWebhook(user.id, webhookId, payload);

            // PLACEHOLDER: Return mock response until Agent 2 is complete
            const responseData: WebhookTestData = {
                success: true,
                response: {
                    status: 200,
                    body: 'OK',
                    duration: 150,
                },
                message: 'Test webhook sent successfully',
            };

            return WebhooksController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error testing webhook:', error);
            return WebhooksController.createErrorResponse<WebhookTestData>(
                'Failed to test webhook',
                500
            );
        }
    }

    /**
     * Regenerate webhook secret
     * POST /api/webhooks/:id/regenerate-secret
     */
    static async regenerateSecret(
        _request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhookRegenerateSecretData>>> {
        try {
            const user = context.user!;
            const webhookId = context.pathParams.webhookId;

            if (!webhookId) {
                return WebhooksController.createErrorResponse<WebhookRegenerateSecretData>(
                    'Webhook ID is required',
                    400
                );
            }

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // const result = await webhookService.regenerateWebhookSecret(user.id, webhookId);

            // PLACEHOLDER: Return mock response until Agent 2 is complete
            return WebhooksController.createErrorResponse<WebhookRegenerateSecretData>(
                'Webhook not found',
                404
            );
        } catch (error) {
            this.logger.error('Error regenerating webhook secret:', error);
            return WebhooksController.createErrorResponse<WebhookRegenerateSecretData>(
                'Failed to regenerate webhook secret',
                500
            );
        }
    }

    /**
     * Get webhook delivery logs
     * GET /api/webhooks/:id/logs?limit=50&offset=0&success=true
     */
    static async getWebhookLogs(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<WebhookLogsData>>> {
        try {
            const user = context.user!;
            const webhookId = context.pathParams.webhookId;

            if (!webhookId) {
                return WebhooksController.createErrorResponse<WebhookLogsData>(
                    'Webhook ID is required',
                    400
                );
            }

            const url = new URL(request.url);
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const offset = parseInt(url.searchParams.get('offset') || '0');
            const successParam = url.searchParams.get('success');
            const success = successParam === 'true' ? true : successParam === 'false' ? false : undefined;

            // Validate pagination parameters
            if (limit < 1 || limit > 100) {
                return WebhooksController.createErrorResponse<WebhookLogsData>(
                    'Limit must be between 1 and 100',
                    400
                );
            }

            if (offset < 0) {
                return WebhooksController.createErrorResponse<WebhookLogsData>(
                    'Offset must be non-negative',
                    400
                );
            }

            // TODO: Import WebhookService from Agent 2
            // const webhookService = new WebhookService(env);
            // const result = await webhookService.getWebhookLogs(user.id, webhookId, { limit, offset, success });

            // PLACEHOLDER: Return mock response until Agent 2 is complete
            const responseData: WebhookLogsData = {
                logs: [],
                total: 0,
            };

            return WebhooksController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error getting webhook logs:', error);
            return WebhooksController.createErrorResponse<WebhookLogsData>(
                'Failed to get webhook logs',
                500
            );
        }
    }
}
