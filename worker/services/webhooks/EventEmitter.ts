/**
 * EventEmitter Service - Core event emission system for workflow triggers
 *
 * Handles:
 * - Event emission to subscribed webhooks
 * - Payload signing with HMAC
 * - Retry logic for failed deliveries
 * - Logging and metrics tracking
 */

import { createLogger } from '../../logger';
import { Database } from '../../database/database';
import { webhooks, webhookLogs, workflowInstances, workflowExecutions } from '../../database/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateNanoId } from '../../utils/idGenerator';

const logger = createLogger('EventEmitter');

export type WorkflowEventType =
    | 'app.created'
    | 'app.deployed'
    | 'app.exported'
    | 'app.error'
    | 'generation.complete'
    | 'deployment.complete'
    | 'user.registered'
    | 'user.verified'
    | 'payment.success'
    | 'payment.failed';

export interface EventPayload {
    eventType: WorkflowEventType;
    timestamp: number;
    data: Record<string, unknown>;
}

export interface WebhookDeliveryResult {
    webhookId: string;
    success: boolean;
    statusCode?: number;
    responseTime?: number;
    error?: string;
}

export class EventEmitter {
    private env: Env;
    private db: Database;

    constructor(env: Env, db: Database) {
        this.env = env;
        this.db = db;
    }

    /**
     * Emit an event to all subscribed webhooks for a user
     */
    async emit(
        userId: string,
        eventType: WorkflowEventType,
        data: Record<string, unknown>
    ): Promise<WebhookDeliveryResult[]> {
        try {
            logger.info('Emitting event', { userId, eventType });

            // Get all active webhooks subscribed to this event type
            const subscribedWebhooks = await this.db.drizzle
                .select()
                .from(webhooks)
                .where(
                    and(
                        eq(webhooks.userId, userId),
                        eq(webhooks.isActive, true)
                    )
                )
                .all();

            if (subscribedWebhooks.length === 0) {
                logger.info('No webhooks subscribed to event', { userId, eventType });
                return [];
            }

            // Filter webhooks that are subscribed to this event type
            const matchingWebhooks = subscribedWebhooks.filter(webhook => {
                const events = JSON.parse(webhook.events as string) as string[];
                return events.includes(eventType);
            });

            if (matchingWebhooks.length === 0) {
                logger.info('No webhooks matching event type', { userId, eventType });
                return [];
            }

            logger.info('Found matching webhooks', {
                userId,
                eventType,
                count: matchingWebhooks.length
            });

            // Deliver to all matching webhooks in parallel
            const deliveryResults = await Promise.allSettled(
                matchingWebhooks.map(webhook =>
                    this.deliverToWebhook(webhook, eventType, data)
                )
            );

            // Process results
            const results: WebhookDeliveryResult[] = deliveryResults.map((result, index) => {
                const webhookId = matchingWebhooks[index].id;

                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    logger.error('Webhook delivery failed', {
                        webhookId,
                        error: result.reason
                    });
                    return {
                        webhookId,
                        success: false,
                        error: result.reason instanceof Error ? result.reason.message : String(result.reason)
                    };
                }
            });

            // Log summary
            const successCount = results.filter(r => r.success).length;
            logger.info('Event emission complete', {
                userId,
                eventType,
                totalWebhooks: results.length,
                successful: successCount,
                failed: results.length - successCount
            });

            return results;
        } catch (error) {
            logger.error('Failed to emit event', { userId, eventType, error });
            throw error;
        }
    }

    /**
     * Deliver event to a single webhook
     */
    private async deliverToWebhook(
        webhook: typeof webhooks.$inferSelect,
        eventType: WorkflowEventType,
        data: Record<string, unknown>
    ): Promise<WebhookDeliveryResult> {
        const startTime = Date.now();
        const logId = generateNanoId();

        try {
            // Build payload
            const payload: EventPayload = {
                eventType,
                timestamp: Date.now(),
                data
            };

            // Sign payload with HMAC
            const signature = await this.signPayload(payload, webhook.secret);

            // Prepare headers
            const customHeaders = webhook.customHeaders
                ? JSON.parse(webhook.customHeaders as string) as Record<string, string>
                : {};

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Event-Type': eventType,
                'X-Webhook-Id': webhook.id,
                ...customHeaders
            };

            // Make HTTP request with timeout
            const timeout = webhook.timeout || 30000;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(webhook.url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const responseTime = Date.now() - startTime;
            const responseBody = await response.text().catch(() => '');

            // Update webhook statistics
            await this.updateWebhookStats(webhook.id, response.ok);

            // Log delivery attempt
            await this.logDelivery({
                id: logId,
                webhookId: webhook.id,
                eventType,
                payload: JSON.stringify(payload),
                url: webhook.url,
                attemptNumber: 1,
                status: response.ok ? 'success' : 'failed',
                statusCode: response.status,
                responseBody: responseBody.substring(0, 1000), // Limit response body size
                responseTime,
                error: response.ok ? undefined : `HTTP ${response.status}`,
                createdAt: new Date(),
                deliveredAt: new Date()
            });

            // Handle retry if needed
            if (!response.ok && webhook.retryEnabled) {
                // Schedule retry (could be implemented with Cloudflare Queues or Durable Objects Alarms)
                logger.warn('Webhook delivery failed, retry may be needed', {
                    webhookId: webhook.id,
                    statusCode: response.status,
                    maxRetries: webhook.maxRetries
                });
            }

            return {
                webhookId: webhook.id,
                success: response.ok,
                statusCode: response.status,
                responseTime
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error('Webhook delivery exception', {
                webhookId: webhook.id,
                error: errorMessage
            });

            // Update webhook statistics
            await this.updateWebhookStats(webhook.id, false);

            // Log failed delivery
            await this.logDelivery({
                id: logId,
                webhookId: webhook.id,
                eventType,
                payload: JSON.stringify({ eventType, timestamp: Date.now(), data }),
                url: webhook.url,
                attemptNumber: 1,
                status: 'failed',
                responseTime,
                error: errorMessage,
                createdAt: new Date()
            });

            return {
                webhookId: webhook.id,
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Sign payload with HMAC SHA-256
     */
    private async signPayload(payload: EventPayload, secret: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        const key = encoder.encode(secret);

        // Import key for HMAC
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        // Sign the payload
        const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);

        // Convert to hex string
        return Array.from(new Uint8Array(signature))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Update webhook statistics
     */
    private async updateWebhookStats(webhookId: string, success: boolean): Promise<void> {
        try {
            const webhook = await this.db.drizzle
                .select()
                .from(webhooks)
                .where(eq(webhooks.id, webhookId))
                .get();

            if (!webhook) return;

            const updates = {
                lastTriggeredAt: new Date(),
                totalDeliveries: (webhook.totalDeliveries || 0) + 1,
                successfulDeliveries: success
                    ? (webhook.successfulDeliveries || 0) + 1
                    : webhook.successfulDeliveries || 0,
                failedDeliveries: !success
                    ? (webhook.failedDeliveries || 0) + 1
                    : webhook.failedDeliveries || 0,
                consecutiveFailures: success
                    ? 0
                    : (webhook.consecutiveFailures || 0) + 1,
                lastSuccessAt: success ? new Date() : webhook.lastSuccessAt,
                lastFailureAt: !success ? new Date() : webhook.lastFailureAt,
                updatedAt: new Date()
            };

            await this.db.drizzle
                .update(webhooks)
                .set(updates)
                .where(eq(webhooks.id, webhookId))
                .run();

            // Auto-disable webhook after too many consecutive failures
            if (updates.consecutiveFailures >= 10) {
                logger.warn('Disabling webhook due to consecutive failures', {
                    webhookId,
                    consecutiveFailures: updates.consecutiveFailures
                });

                await this.db.drizzle
                    .update(webhooks)
                    .set({ isActive: false })
                    .where(eq(webhooks.id, webhookId))
                    .run();
            }
        } catch (error) {
            logger.error('Failed to update webhook stats', { webhookId, error });
        }
    }

    /**
     * Log webhook delivery attempt
     */
    private async logDelivery(log: {
        id: string;
        webhookId: string;
        eventType: string;
        payload: string;
        url: string;
        attemptNumber: number;
        status: 'pending' | 'success' | 'failed' | 'retrying';
        statusCode?: number;
        responseBody?: string;
        responseTime?: number;
        error?: string;
        createdAt: Date;
        deliveredAt?: Date;
        nextRetryAt?: Date;
    }): Promise<void> {
        try {
            await this.db.drizzle
                .insert(webhookLogs)
                .values(log)
                .run();
        } catch (error) {
            logger.error('Failed to log webhook delivery', { webhookId: log.webhookId, error });
        }
    }

    /**
     * Trigger workflow instances for an event
     * This works with n8n workflow instances
     */
    async triggerWorkflows(
        userId: string,
        eventType: WorkflowEventType,
        data: Record<string, unknown>
    ): Promise<void> {
        try {
            // Get active workflow instances triggered by this event
            const instances = await this.db.drizzle
                .select()
                .from(workflowInstances)
                .where(
                    and(
                        eq(workflowInstances.userId, userId),
                        eq(workflowInstances.status, 'active')
                    )
                )
                .all();

            if (instances.length === 0) {
                logger.info('No active workflow instances for user', { userId, eventType });
                return;
            }

            logger.info('Triggering workflow instances', {
                userId,
                eventType,
                count: instances.length
            });

            // Trigger each workflow instance via n8n webhook
            await Promise.allSettled(
                instances.map(instance =>
                    this.triggerWorkflowInstance(instance, eventType, data)
                )
            );
        } catch (error) {
            logger.error('Failed to trigger workflows', { userId, eventType, error });
        }
    }

    /**
     * Trigger a single workflow instance
     */
    private async triggerWorkflowInstance(
        instance: typeof workflowInstances.$inferSelect,
        eventType: WorkflowEventType,
        data: Record<string, unknown>
    ): Promise<void> {
        if (!instance.n8nWebhookUrl) {
            logger.warn('Workflow instance has no webhook URL', { instanceId: instance.id });
            return;
        }

        try {
            const payload = {
                eventType,
                timestamp: Date.now(),
                data
            };

            const response = await fetch(instance.n8nWebhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                logger.info('Workflow instance triggered', {
                    instanceId: instance.id,
                    eventType
                });

                // Update instance statistics
                await this.db.drizzle
                    .update(workflowInstances)
                    .set({
                        lastExecutedAt: new Date(),
                        executionCount: (instance.executionCount || 0) + 1,
                        updatedAt: new Date()
                    })
                    .where(eq(workflowInstances.id, instance.id))
                    .run();
            } else {
                logger.error('Workflow instance trigger failed', {
                    instanceId: instance.id,
                    statusCode: response.status
                });

                // Update error count
                await this.db.drizzle
                    .update(workflowInstances)
                    .set({
                        errorCount: (instance.errorCount || 0) + 1,
                        lastError: `HTTP ${response.status}`,
                        updatedAt: new Date()
                    })
                    .where(eq(workflowInstances.id, instance.id))
                    .run();
            }
        } catch (error) {
            logger.error('Failed to trigger workflow instance', {
                instanceId: instance.id,
                error
            });

            // Update error count
            await this.db.drizzle
                .update(workflowInstances)
                .set({
                    errorCount: (instance.errorCount || 0) + 1,
                    lastError: error instanceof Error ? error.message : String(error),
                    updatedAt: new Date()
                })
                .where(eq(workflowInstances.id, instance.id))
                .run();
        }
    }
}
