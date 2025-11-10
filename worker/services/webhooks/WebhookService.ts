/**
 * Webhook Service
 * High-level webhook management and coordination
 */

import { createLogger } from '../../logger';
import { WebhookDBService } from '../../database/services/WebhookDBService';
import { WebhookSigner } from './WebhookSigner';
import { WebhookDeliveryService } from './WebhookDeliveryService';
import type { Webhook, WebhookLog } from '../../database/schema';
import type { CreateWebhookData, UpdateWebhookData, DeliveryResult } from './types';

export class WebhookService {
    private logger = createLogger('WebhookService');
    private dbService: WebhookDBService;
    private signer: WebhookSigner;
    private deliveryService: WebhookDeliveryService;
    private env: Env;

    constructor(env: Env) {
        this.env = env;
        this.dbService = new WebhookDBService(env);
        this.signer = new WebhookSigner();
        this.deliveryService = new WebhookDeliveryService();
    }

    // Webhook CRUD Operations

    /**
     * Create a new webhook
     */
    async createWebhook(userId: string, data: CreateWebhookData): Promise<Webhook> {
        this.logger.info('Creating webhook', { userId, name: data.name });

        // Validate webhook URL
        if (!this.signer.validateWebhookUrl(data.url)) {
            throw new Error('Invalid webhook URL');
        }

        // Generate webhook secret
        const secret = this.signer.generateSecret();

        // Create webhook in database
        const webhook = await this.dbService.createWebhook({
            id: crypto.randomUUID(),
            userId,
            name: data.name,
            description: data.description || null,
            url: data.url,
            secret,
            events: JSON.stringify(data.events),
            filters: JSON.stringify(data.filters || {}),
            timeout: data.timeout || 30000,
            retryEnabled: data.retryEnabled ?? true,
            maxRetries: data.maxRetries || 3,
            customHeaders: JSON.stringify(data.customHeaders || {}),
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
        });

        return webhook;
    }

    /**
     * Get webhook by ID
     */
    async getWebhook(webhookId: string): Promise<Webhook | null> {
        return await this.dbService.getWebhook(webhookId);
    }

    /**
     * Get all webhooks for a user
     */
    async getUserWebhooks(userId: string): Promise<Webhook[]> {
        return await this.dbService.getUserWebhooks(userId);
    }

    /**
     * Update webhook
     */
    async updateWebhook(
        webhookId: string,
        data: UpdateWebhookData
    ): Promise<Webhook> {
        this.logger.info('Updating webhook', { webhookId });

        // Validate URL if provided
        if (data.url && !this.signer.validateWebhookUrl(data.url)) {
            throw new Error('Invalid webhook URL');
        }

        const updateData: Partial<Webhook> = {
            ...(data.name && { name: data.name }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.url && { url: data.url }),
            ...(data.events && { events: JSON.stringify(data.events) }),
            ...(data.filters !== undefined && {
                filters: JSON.stringify(data.filters),
            }),
            ...(data.timeout !== undefined && { timeout: data.timeout }),
            ...(data.retryEnabled !== undefined && { retryEnabled: data.retryEnabled }),
            ...(data.maxRetries !== undefined && { maxRetries: data.maxRetries }),
            ...(data.customHeaders !== undefined && {
                customHeaders: JSON.stringify(data.customHeaders),
            }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
        };

        return await this.dbService.updateWebhook(webhookId, updateData);
    }

    /**
     * Delete webhook
     */
    async deleteWebhook(webhookId: string): Promise<void> {
        this.logger.info('Deleting webhook', { webhookId });
        await this.dbService.deleteWebhook(webhookId);
    }

    /**
     * Test webhook delivery
     */
    async testWebhook(webhookId: string): Promise<DeliveryResult> {
        this.logger.info('Testing webhook', { webhookId });

        const webhook = await this.dbService.getWebhook(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        const result = await this.deliveryService.testWebhook(webhook);

        // Log the test delivery
        await this.logDelivery(webhook, 'test', { test: true }, result, 1);

        return result;
    }

    // Event Emission

    /**
     * Emit an event to all subscribed webhooks for a user
     */
    async emitEvent(
        userId: string,
        eventType: string,
        payload: object
    ): Promise<void> {
        this.logger.info('Emitting event', { userId, eventType });

        // Get webhooks subscribed to this event
        const webhooks = await this.dbService.getWebhooksByEvent(userId, eventType);

        if (webhooks.length === 0) {
            this.logger.debug('No webhooks subscribed to event', { eventType });
            return;
        }

        // Emit to all subscribed webhooks
        await Promise.all(
            webhooks.map((webhook) => this.emitToWebhook(webhook.id, eventType, payload))
        );
    }

    /**
     * Emit an event to a specific webhook
     */
    async emitToWebhook(
        webhookId: string,
        eventType: string,
        payload: object
    ): Promise<void> {
        this.logger.info('Emitting to webhook', { webhookId, eventType });

        const webhook = await this.dbService.getWebhook(webhookId);
        if (!webhook || !webhook.isActive) {
            this.logger.warn('Webhook not found or inactive', { webhookId });
            return;
        }

        // Check if webhook is subscribed to this event
        const subscribedEvents = JSON.parse(webhook.events as string) as string[];
        if (!subscribedEvents.includes(eventType) && !subscribedEvents.includes('*')) {
            this.logger.debug('Webhook not subscribed to event', {
                webhookId,
                eventType,
            });
            return;
        }

        // Get webhook queue Durable Object
        const queueId = this.env.WEBHOOK_QUEUE.idFromName(webhook.userId);
        const queue = this.env.WEBHOOK_QUEUE.get(queueId);

        // Enqueue for delivery
        await queue.enqueue(webhook, eventType, payload);
    }

    /**
     * Deliver webhook immediately (synchronous)
     */
    async deliverWebhookNow(
        webhookId: string,
        eventType: string,
        payload: object
    ): Promise<DeliveryResult> {
        const webhook = await this.dbService.getWebhook(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        const result = await this.deliveryService.deliverWebhook(
            webhook,
            eventType,
            payload
        );

        // Update stats and log
        await this.dbService.updateWebhookStats(webhookId, result.success);
        await this.logDelivery(webhook, eventType, payload, result, 1);

        return result;
    }

    // Logging

    /**
     * Log webhook delivery attempt
     */
    private async logDelivery(
        webhook: Webhook,
        eventType: string,
        payload: object,
        result: DeliveryResult,
        attemptNumber: number
    ): Promise<void> {
        const status = result.success
            ? 'success'
            : attemptNumber < (webhook.maxRetries || 3)
            ? 'retrying'
            : 'failed';

        await this.dbService.createWebhookLog({
            id: crypto.randomUUID(),
            webhookId: webhook.id,
            eventType,
            payload: JSON.stringify(payload),
            url: webhook.url,
            attemptNumber,
            status,
            statusCode: result.statusCode || null,
            responseBody: result.responseBody || null,
            responseTime: result.responseTime,
            error: result.error || null,
            createdAt: new Date(),
            deliveredAt: result.success ? new Date() : null,
            nextRetryAt:
                status === 'retrying'
                    ? new Date(
                          this.deliveryService.calculateNextRetry(attemptNumber)
                      )
                    : null,
        });
    }

    /**
     * Get webhook logs
     */
    async getWebhookLogs(webhookId: string, limit = 50): Promise<WebhookLog[]> {
        return await this.dbService.getWebhookLogs(webhookId, limit);
    }

    /**
     * Get recent failures for a webhook
     */
    async getRecentFailures(webhookId: string): Promise<WebhookLog[]> {
        return await this.dbService.getRecentFailures(webhookId, 10);
    }

    /**
     * Retry a failed delivery
     */
    async retryDelivery(logId: string): Promise<DeliveryResult> {
        // Get the log entry
        const logs = await this.dbService.getWebhookLogs(logId, 1);
        const log = logs[0];

        if (!log) {
            throw new Error('Webhook log not found');
        }

        const webhook = await this.dbService.getWebhook(log.webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        // Parse payload
        const payload = JSON.parse(log.payload as string);

        // Attempt delivery
        const result = await this.deliveryService.deliverWebhook(
            webhook,
            log.eventType,
            payload
        );

        // Update stats and log
        await this.dbService.updateWebhookStats(webhook.id, result.success);
        await this.logDelivery(webhook, log.eventType, payload, result, log.attemptNumber + 1);

        return result;
    }

    /**
     * Rotate webhook secret
     */
    async rotateSecret(webhookId: string): Promise<string> {
        this.logger.info('Rotating webhook secret', { webhookId });

        const newSecret = this.signer.generateSecret();

        await this.dbService.updateWebhook(webhookId, {
            secret: newSecret,
        });

        return newSecret;
    }

    /**
     * Pause webhook
     */
    async pauseWebhook(webhookId: string): Promise<void> {
        await this.dbService.updateWebhook(webhookId, { isActive: false });
    }

    /**
     * Resume webhook
     */
    async resumeWebhook(webhookId: string): Promise<void> {
        await this.dbService.updateWebhook(webhookId, { isActive: true });
    }
}
