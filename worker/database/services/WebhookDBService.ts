/**
 * Webhook Database Service
 * Handles all database operations for webhooks
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { BaseService } from './BaseService';
import { webhooks, webhookLogs, type Webhook, type WebhookLog, type NewWebhook, type NewWebhookLog } from '../schema';

export class WebhookDBService extends BaseService {
    /**
     * Create a new webhook
     */
    async createWebhook(data: NewWebhook): Promise<Webhook> {
        try {
            const [webhook] = await this.database
                .insert(webhooks)
                .values(data)
                .returning();

            this.logger.info('Webhook created', { webhookId: webhook.id });
            return webhook;
        } catch (error) {
            this.handleDatabaseError(error, 'createWebhook', { data });
        }
    }

    /**
     * Get webhook by ID
     */
    async getWebhook(webhookId: string): Promise<Webhook | null> {
        try {
            const [webhook] = await this.database
                .select()
                .from(webhooks)
                .where(eq(webhooks.id, webhookId))
                .limit(1);

            return webhook || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getWebhook', { webhookId });
        }
    }

    /**
     * Get all webhooks for a user
     */
    async getUserWebhooks(userId: string): Promise<Webhook[]> {
        try {
            const results = await this.database
                .select()
                .from(webhooks)
                .where(eq(webhooks.userId, userId))
                .orderBy(desc(webhooks.createdAt));

            return results;
        } catch (error) {
            this.handleDatabaseError(error, 'getUserWebhooks', { userId });
        }
    }

    /**
     * Get active webhooks for a user
     */
    async getActiveWebhooks(userId: string): Promise<Webhook[]> {
        try {
            const results = await this.database
                .select()
                .from(webhooks)
                .where(
                    and(
                        eq(webhooks.userId, userId),
                        eq(webhooks.isActive, true)
                    )
                )
                .orderBy(desc(webhooks.createdAt));

            return results;
        } catch (error) {
            this.handleDatabaseError(error, 'getActiveWebhooks', { userId });
        }
    }

    /**
     * Get webhooks subscribed to a specific event type
     */
    async getWebhooksByEvent(userId: string, eventType: string): Promise<Webhook[]> {
        try {
            const results = await this.database
                .select()
                .from(webhooks)
                .where(
                    and(
                        eq(webhooks.userId, userId),
                        eq(webhooks.isActive, true),
                        sql`json_extract(${webhooks.events}, '$') LIKE ${'%' + eventType + '%'}`
                    )
                );

            return results;
        } catch (error) {
            this.handleDatabaseError(error, 'getWebhooksByEvent', { userId, eventType });
        }
    }

    /**
     * Update webhook
     */
    async updateWebhook(webhookId: string, data: Partial<Webhook>): Promise<Webhook> {
        try {
            const [webhook] = await this.database
                .update(webhooks)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(eq(webhooks.id, webhookId))
                .returning();

            this.logger.info('Webhook updated', { webhookId });
            return webhook;
        } catch (error) {
            this.handleDatabaseError(error, 'updateWebhook', { webhookId, data });
        }
    }

    /**
     * Delete webhook
     */
    async deleteWebhook(webhookId: string): Promise<void> {
        try {
            await this.database
                .delete(webhooks)
                .where(eq(webhooks.id, webhookId));

            this.logger.info('Webhook deleted', { webhookId });
        } catch (error) {
            this.handleDatabaseError(error, 'deleteWebhook', { webhookId });
        }
    }

    /**
     * Update webhook statistics
     */
    async updateWebhookStats(
        webhookId: string,
        success: boolean,
        responseTime?: number
    ): Promise<void> {
        try {
            const now = new Date();

            await this.database
                .update(webhooks)
                .set({
                    lastTriggeredAt: now,
                    ...(success
                        ? {
                              lastSuccessAt: now,
                              consecutiveFailures: 0,
                              successfulDeliveries: sql`${webhooks.successfulDeliveries} + 1`,
                          }
                        : {
                              lastFailureAt: now,
                              consecutiveFailures: sql`${webhooks.consecutiveFailures} + 1`,
                              failedDeliveries: sql`${webhooks.failedDeliveries} + 1`,
                          }),
                    totalDeliveries: sql`${webhooks.totalDeliveries} + 1`,
                })
                .where(eq(webhooks.id, webhookId));
        } catch (error) {
            this.handleDatabaseError(error, 'updateWebhookStats', {
                webhookId,
                success,
            });
        }
    }

    // Webhook Logs

    /**
     * Create webhook log entry
     */
    async createWebhookLog(data: NewWebhookLog): Promise<WebhookLog> {
        try {
            const [log] = await this.database
                .insert(webhookLogs)
                .values(data)
                .returning();

            return log;
        } catch (error) {
            this.handleDatabaseError(error, 'createWebhookLog', { data });
        }
    }

    /**
     * Get webhook logs
     */
    async getWebhookLogs(webhookId: string, limit = 50): Promise<WebhookLog[]> {
        try {
            const logs = await this.database
                .select()
                .from(webhookLogs)
                .where(eq(webhookLogs.webhookId, webhookId))
                .orderBy(desc(webhookLogs.createdAt))
                .limit(limit);

            return logs;
        } catch (error) {
            this.handleDatabaseError(error, 'getWebhookLogs', { webhookId, limit });
        }
    }

    /**
     * Get recent failures for a webhook
     */
    async getRecentFailures(webhookId: string, limit = 10): Promise<WebhookLog[]> {
        try {
            const failures = await this.database
                .select()
                .from(webhookLogs)
                .where(
                    and(
                        eq(webhookLogs.webhookId, webhookId),
                        eq(webhookLogs.status, 'failed')
                    )
                )
                .orderBy(desc(webhookLogs.createdAt))
                .limit(limit);

            return failures;
        } catch (error) {
            this.handleDatabaseError(error, 'getRecentFailures', {
                webhookId,
                limit,
            });
        }
    }

    /**
     * Get pending retry logs
     */
    async getPendingRetries(): Promise<WebhookLog[]> {
        try {
            const now = new Date();

            const pending = await this.database
                .select()
                .from(webhookLogs)
                .where(
                    and(
                        eq(webhookLogs.status, 'retrying'),
                        sql`${webhookLogs.nextRetryAt} <= ${now.getTime()}`
                    )
                )
                .orderBy(webhookLogs.nextRetryAt);

            return pending;
        } catch (error) {
            this.handleDatabaseError(error, 'getPendingRetries', {});
        }
    }

    /**
     * Update webhook log status
     */
    async updateWebhookLog(logId: string, data: Partial<WebhookLog>): Promise<void> {
        try {
            await this.database
                .update(webhookLogs)
                .set(data)
                .where(eq(webhookLogs.id, logId));
        } catch (error) {
            this.handleDatabaseError(error, 'updateWebhookLog', { logId, data });
        }
    }

    /**
     * Clean up old webhook logs
     */
    async cleanupOldLogs(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
        try {
            const cutoffDate = new Date(Date.now() - maxAge);

            const result = await this.database
                .delete(webhookLogs)
                .where(sql`${webhookLogs.createdAt} < ${cutoffDate}`)
                .returning({ id: webhookLogs.id });

            this.logger.info('Cleaned up old webhook logs', {
                count: result.length,
                cutoffDate,
            });

            return result.length;
        } catch (error) {
            this.handleDatabaseError(error, 'cleanupOldLogs', { maxAge });
        }
    }

    /**
     * Get webhook with recent logs
     */
    async getWebhookWithLogs(webhookId: string): Promise<{
        webhook: Webhook;
        logs: WebhookLog[];
    } | null> {
        try {
            const webhook = await this.getWebhook(webhookId);
            if (!webhook) {
                return null;
            }

            const logs = await this.getWebhookLogs(webhookId, 10);

            return { webhook, logs };
        } catch (error) {
            this.handleDatabaseError(error, 'getWebhookWithLogs', { webhookId });
        }
    }
}
