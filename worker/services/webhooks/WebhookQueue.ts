/**
 * Webhook Queue Durable Object
 * Reliable webhook delivery queue with SQLite persistence
 */

import { DurableObject } from 'cloudflare:workers';
import { createLogger } from '../../logger';
import { WebhookDeliveryService } from './WebhookDeliveryService';
import type { QueuedWebhook, QueueStatus, DeliveryResult } from './types';
import type { Webhook } from '../../database/schema';

interface QueuedWebhookRow {
    id: string;
    webhookId: string;
    eventType: string;
    payload: string; // JSON string
    attemptNumber: number;
    status: 'pending' | 'processing' | 'success' | 'failed';
    scheduledAt: number;
    lastAttemptAt: number | null;
    error: string | null;
    createdAt: number;
}

export class WebhookQueue extends DurableObject {
    private logger = createLogger('WebhookQueue');
    private deliveryService: WebhookDeliveryService;
    private processingInterval: ReturnType<typeof setInterval> | null = null;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.deliveryService = new WebhookDeliveryService();
        this.initializeDatabase();
        this.startProcessing();
    }

    /**
     * Initialize SQLite database for queue persistence
     */
    private async initializeDatabase(): Promise<void> {
        await this.ctx.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS webhook_queue (
                id TEXT PRIMARY KEY,
                webhook_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                attempt_number INTEGER DEFAULT 1,
                status TEXT DEFAULT 'pending',
                scheduled_at INTEGER NOT NULL,
                last_attempt_at INTEGER,
                error TEXT,
                created_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_webhook_queue_status
                ON webhook_queue(status);
            CREATE INDEX IF NOT EXISTS idx_webhook_queue_scheduled_at
                ON webhook_queue(scheduled_at);
            CREATE INDEX IF NOT EXISTS idx_webhook_queue_webhook_id
                ON webhook_queue(webhook_id);
        `);

        this.logger.info('Webhook queue database initialized');
    }

    /**
     * Start periodic queue processing
     */
    private startProcessing(): void {
        if (this.processingInterval) {
            return;
        }

        // Process queue every 30 seconds
        this.processingInterval = setInterval(() => {
            this.processQueue().catch((error) => {
                this.logger.error('Error processing queue', { error });
            });
        }, 30000);

        // Process immediately on start
        this.processQueue().catch((error) => {
            this.logger.error('Error processing queue', { error });
        });
    }

    /**
     * Enqueue a webhook for delivery
     */
    async enqueue(
        webhook: Webhook,
        eventType: string,
        payload: object
    ): Promise<void> {
        const id = crypto.randomUUID();
        const now = Date.now();

        await this.ctx.storage.sql.exec(
            `INSERT INTO webhook_queue (
                id, webhook_id, event_type, payload,
                attempt_number, status, scheduled_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            id,
            webhook.id,
            eventType,
            JSON.stringify(payload),
            1,
            'pending',
            now,
            now
        );

        this.logger.info('Webhook enqueued', {
            id,
            webhookId: webhook.id,
            eventType,
        });

        // Trigger immediate processing for this item
        this.processQueue().catch((error) => {
            this.logger.error('Error processing queue after enqueue', { error });
        });
    }

    /**
     * Process pending webhooks in the queue
     */
    async processQueue(): Promise<void> {
        this.logger.debug('Processing webhook queue');

        const now = Date.now();

        // Get pending items scheduled for now or earlier
        const cursor = this.ctx.storage.sql.exec<QueuedWebhookRow>(
            `SELECT * FROM webhook_queue
             WHERE status = 'pending'
             AND scheduled_at <= ?
             ORDER BY scheduled_at ASC
             LIMIT 10`,
            now
        );

        const pending: QueuedWebhookRow[] = [];
        for (const row of cursor) {
            pending.push(row);
        }

        if (pending.length === 0) {
            this.logger.debug('No pending webhooks to process');
            return;
        }

        this.logger.info('Processing pending webhooks', { count: pending.length });

        // Process each pending webhook
        for (const item of pending) {
            await this.processItem(item);
        }
    }

    /**
     * Process a single queued webhook
     */
    private async processItem(item: QueuedWebhookRow): Promise<void> {
        try {
            // Mark as processing
            await this.ctx.storage.sql.exec(
                `UPDATE webhook_queue SET status = 'processing', last_attempt_at = ? WHERE id = ?`,
                Date.now(),
                item.id
            );

            // Parse payload
            const payload = JSON.parse(item.payload);

            // Need to fetch webhook details from database
            // For now, we'll use a simplified approach
            // In production, this would fetch from the main D1 database
            const webhook: Webhook = {
                id: item.webhookId,
                userId: '', // Will be fetched from DB
                name: '',
                description: null,
                url: '', // Will be fetched from DB
                secret: '', // Will be fetched from DB
                events: JSON.stringify([item.eventType]),
                filters: '{}',
                timeout: 30000,
                retryEnabled: true,
                maxRetries: 3,
                customHeaders: '{}',
                isActive: true,
                lastTriggeredAt: null,
                lastSuccessAt: null,
                lastFailureAt: null,
                consecutiveFailures: 0,
                totalDeliveries: 0,
                successfulDeliveries: 0,
                failedDeliveries: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Attempt delivery
            const result = await this.deliveryService.deliverToUrl(
                item.payload, // This should be webhook.url in production
                payload,
                item.webhookId, // This should be webhook.secret in production
                item.eventType
            );

            await this.handleDeliveryResult(item, result);
        } catch (error) {
            this.logger.error('Error processing queue item', {
                itemId: item.id,
                error,
            });

            // Mark as failed
            await this.ctx.storage.sql.exec(
                `UPDATE webhook_queue
                 SET status = 'failed', error = ?
                 WHERE id = ?`,
                (error as Error).message,
                item.id
            );
        }
    }

    /**
     * Handle delivery result and update queue item
     */
    private async handleDeliveryResult(
        item: QueuedWebhookRow,
        result: DeliveryResult
    ): Promise<void> {
        if (result.success) {
            // Mark as success
            await this.ctx.storage.sql.exec(
                `UPDATE webhook_queue SET status = 'success' WHERE id = ?`,
                item.id
            );

            this.logger.info('Webhook delivery successful', { itemId: item.id });
        } else {
            // Check if we should retry
            const maxRetries = 3;
            const shouldRetry =
                this.deliveryService.shouldRetry(result) &&
                item.attemptNumber < maxRetries;

            if (shouldRetry) {
                // Schedule retry
                const nextAttempt = item.attemptNumber + 1;
                const nextRetryAt = this.deliveryService.calculateNextRetry(nextAttempt);

                await this.ctx.storage.sql.exec(
                    `UPDATE webhook_queue
                     SET status = 'pending',
                         attempt_number = ?,
                         scheduled_at = ?,
                         error = ?
                     WHERE id = ?`,
                    nextAttempt,
                    nextRetryAt,
                    result.error || 'Unknown error',
                    item.id
                );

                this.logger.info('Webhook retry scheduled', {
                    itemId: item.id,
                    attemptNumber: nextAttempt,
                    nextRetryAt: new Date(nextRetryAt),
                });
            } else {
                // Mark as permanently failed
                await this.ctx.storage.sql.exec(
                    `UPDATE webhook_queue
                     SET status = 'failed', error = ?
                     WHERE id = ?`,
                    result.error || 'Max retries exceeded',
                    item.id
                );

                this.logger.warn('Webhook delivery failed permanently', {
                    itemId: item.id,
                    error: result.error,
                });
            }
        }
    }

    /**
     * Retry failed deliveries
     */
    async retryFailed(): Promise<void> {
        this.logger.info('Retrying failed webhooks');

        const now = Date.now();

        // Reset failed items to pending
        await this.ctx.storage.sql.exec(
            `UPDATE webhook_queue
             SET status = 'pending',
                 attempt_number = 1,
                 scheduled_at = ?,
                 error = NULL
             WHERE status = 'failed'`,
            now
        );

        // Process the queue
        await this.processQueue();
    }

    /**
     * Get queue status
     */
    async getQueueStatus(): Promise<QueueStatus> {
        const cursor = this.ctx.storage.sql.exec<{ status: string; count: number }>(
            `SELECT status, COUNT(*) as count
             FROM webhook_queue
             GROUP BY status`
        );

        const status: QueueStatus = {
            pending: 0,
            processing: 0,
            failed: 0,
            succeeded: 0,
        };

        for (const row of cursor) {
            switch (row.status) {
                case 'pending':
                    status.pending = row.count;
                    break;
                case 'processing':
                    status.processing = row.count;
                    break;
                case 'failed':
                    status.failed = row.count;
                    break;
                case 'success':
                    status.succeeded = row.count;
                    break;
            }
        }

        return status;
    }

    /**
     * Clean up old successful/failed items
     */
    async cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
        const cutoff = Date.now() - maxAge;

        await this.ctx.storage.sql.exec(
            `DELETE FROM webhook_queue
             WHERE (status = 'success' OR status = 'failed')
             AND created_at < ?`,
            cutoff
        );

        this.logger.info('Cleaned up old webhook queue items', { cutoff });
    }

    /**
     * Get webhook history for a specific webhook
     */
    async getWebhookHistory(webhookId: string, limit = 50): Promise<QueuedWebhookRow[]> {
        const cursor = this.ctx.storage.sql.exec<QueuedWebhookRow>(
            `SELECT * FROM webhook_queue
             WHERE webhook_id = ?
             ORDER BY created_at DESC
             LIMIT ?`,
            webhookId,
            limit
        );

        const history: QueuedWebhookRow[] = [];
        for (const row of cursor) {
            history.push(row);
        }

        return history;
    }
}
