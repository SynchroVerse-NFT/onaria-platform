/**
 * Webhook Events Controller
 * Internal endpoint for emitting events to trigger workflows
 */

import { BaseController } from '../../baseController';
import { ApiResponse, ControllerResponse } from '../../types';
import { RouteContext } from '../../../types/route-context';
import type { EventEmitData } from './types';
import type { WorkflowEventType } from '../../../../../src/api-types';
import { emitEvent } from '../../../../services/webhooks/EventEmitterSingleton';
import { validatePayload } from '../../../../services/webhooks/EventPayloadValidator';
import { Database } from '../../../../database/database';
import { WorkflowEventType as EventEmitterWorkflowEventType } from '../../../../services/webhooks/EventEmitter';

export class WebhookEventsController extends BaseController {

    /**
     * Emit an event to trigger workflows
     * POST /api/webhooks/events/emit
     *
     * This is an internal endpoint used by the platform to trigger workflows.
     * It should be protected with appropriate authentication/authorization.
     */
    static async emitEvent(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<EventEmitData>>> {
        try {
            // This endpoint could require special internal authentication
            // For now, we'll use standard auth but this should be reviewed
            const user = context.user!;

            const bodyResult = await WebhookEventsController.parseJsonBody<{
                eventType: WorkflowEventType;
                userId: string;
                data: Record<string, unknown>;
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<EventEmitData>>;
            }

            const { eventType, userId, data } = bodyResult.data!;

            // Validate required fields
            if (!eventType || !userId || !data) {
                return WebhookEventsController.createErrorResponse<EventEmitData>(
                    'Missing required fields: eventType, userId, data',
                    400
                );
            }

            // Validate event type
            const validEventTypes: WorkflowEventType[] = [
                'app.created',
                'app.deployed',
                'app.error',
                'app.exported',
                'generation.complete',
                'deployment.complete',
            ];

            if (!validEventTypes.includes(eventType)) {
                return WebhookEventsController.createErrorResponse<EventEmitData>(
                    'Invalid event type',
                    400
                );
            }

            // Add timestamp to data if not present
            const enrichedData = {
                ...data,
                timestamp: data.timestamp || Date.now()
            };

            // Validate payload
            const validation = validatePayload(eventType as EventEmitterWorkflowEventType, enrichedData);
            if (!validation.valid) {
                return WebhookEventsController.createErrorResponse<EventEmitData>(
                    `Invalid event payload: ${validation.errors.join(', ')}`,
                    400
                );
            }

            // Emit the event
            const database = new Database(env);
            const results = await emitEvent(
                env,
                database,
                userId,
                eventType as EventEmitterWorkflowEventType,
                enrichedData
            );

            const responseData: EventEmitData = {
                webhooksTriggered: results?.length || 0,
                message: 'Event emitted successfully',
            };

            return WebhookEventsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error emitting webhook event:', error);
            return WebhookEventsController.createErrorResponse<EventEmitData>(
                'Failed to emit webhook event',
                500
            );
        }
    }

    /**
     * Test event emission endpoint
     * POST /api/webhooks/events/test
     *
     * Allows testing event emission with mock data
     */
    static async testEvent(
        request: Request,
        env: Env,
        _ctx: ExecutionContext,
        context: RouteContext
    ): Promise<ControllerResponse<ApiResponse<EventEmitData>>> {
        try {
            const user = context.user!;

            const bodyResult = await WebhookEventsController.parseJsonBody<{
                eventType: WorkflowEventType;
                appId?: string;
                mockData?: Record<string, unknown>;
            }>(request);

            if (!bodyResult.success) {
                return bodyResult.response! as ControllerResponse<ApiResponse<EventEmitData>>;
            }

            const { eventType, appId, mockData } = bodyResult.data!;

            // Validate event type
            const validEventTypes: WorkflowEventType[] = [
                'app.created',
                'app.deployed',
                'app.error',
                'app.exported',
                'generation.complete',
                'deployment.complete',
            ];

            if (!validEventTypes.includes(eventType)) {
                return WebhookEventsController.createErrorResponse<EventEmitData>(
                    'Invalid event type',
                    400
                );
            }

            // Build mock data based on event type
            const testData = mockData || WebhookEventsController.getMockDataForEvent(
                eventType,
                user.id,
                appId || 'test-app-id'
            );

            // Emit the event
            const database = new Database(env);
            const results = await emitEvent(
                env,
                database,
                user.id,
                eventType as EventEmitterWorkflowEventType,
                testData
            );

            const responseData: EventEmitData = {
                webhooksTriggered: results?.length || 0,
                message: `Test event ${eventType} emitted successfully`,
            };

            return WebhookEventsController.createSuccessResponse(responseData);
        } catch (error) {
            this.logger.error('Error testing webhook event:', error);
            return WebhookEventsController.createErrorResponse<EventEmitData>(
                'Failed to test webhook event',
                500
            );
        }
    }

    /**
     * Get mock data for testing different event types
     */
    private static getMockDataForEvent(
        eventType: WorkflowEventType,
        userId: string,
        appId: string
    ): Record<string, unknown> {
        const timestamp = Date.now();

        switch (eventType) {
            case 'app.created':
                return {
                    appId,
                    appName: 'Test App',
                    userId,
                    templateName: 'react-starter',
                    framework: 'react',
                    originalPrompt: 'Test prompt',
                    timestamp
                };

            case 'app.deployed':
            case 'deployment.complete':
                return {
                    appId,
                    appName: 'Test App',
                    userId,
                    deploymentUrl: 'https://test-app.example.com',
                    environment: 'preview',
                    instanceId: 'test-instance-id',
                    timestamp
                };

            case 'app.exported':
                return {
                    appId,
                    appName: 'Test App',
                    userId,
                    repositoryUrl: 'https://github.com/user/test-repo',
                    isPrivate: false,
                    timestamp
                };

            case 'app.error':
                return {
                    appId,
                    appName: 'Test App',
                    userId,
                    errorType: 'runtime_error',
                    errorMessage: 'Test error message',
                    stackTrace: 'Error: Test error\n    at testFunction (file.js:10:5)',
                    source: 'runtime',
                    timestamp
                };

            case 'generation.complete':
                return {
                    appId,
                    appName: 'Test App',
                    userId,
                    filesGenerated: 25,
                    duration: 45000,
                    timestamp
                };

            default:
                return { userId, appId, timestamp };
        }
    }
}
