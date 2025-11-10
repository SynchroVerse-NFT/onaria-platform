/**
 * Webhook Delivery Service
 * Handles webhook delivery with retry logic and exponential backoff
 */

import { createLogger } from '../../logger';
import { WebhookSigner } from './WebhookSigner';
import type { Webhook } from '../../database/schema';
import type { DeliveryResult } from './types';

export class WebhookDeliveryService {
    private logger = createLogger('WebhookDeliveryService');
    private signer: WebhookSigner;

    // Retry configuration
    private readonly RETRY_DELAYS = [1000, 5000, 30000]; // 1s, 5s, 30s
    private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

    constructor() {
        this.signer = new WebhookSigner();
    }

    /**
     * Deliver a webhook with automatic retry logic
     */
    async deliverWebhook(
        webhook: Webhook,
        eventType: string,
        payload: object
    ): Promise<DeliveryResult> {
        this.logger.info('Delivering webhook', {
            webhookId: webhook.id,
            eventType,
            url: webhook.url,
        });

        return await this.deliverToUrl(
            webhook.url,
            payload,
            webhook.secret,
            eventType,
            webhook.timeout || this.DEFAULT_TIMEOUT,
            webhook.customHeaders
                ? (JSON.parse(webhook.customHeaders as string) as Record<string, string>)
                : {}
        );
    }

    /**
     * Deliver webhook to a specific URL
     */
    async deliverToUrl(
        url: string,
        payload: object,
        secret: string,
        eventType: string,
        timeout: number = this.DEFAULT_TIMEOUT,
        customHeaders: Record<string, string> = {}
    ): Promise<DeliveryResult> {
        const startTime = Date.now();

        try {
            // Validate URL
            if (!this.signer.validateWebhookUrl(url)) {
                return {
                    success: false,
                    error: 'Invalid webhook URL',
                    responseTime: Date.now() - startTime,
                };
            }

            // Generate timestamp and signature
            const timestamp = Date.now();
            const signature = await this.signer.sign(payload, secret, timestamp);

            // Create headers
            const headers = this.signer.createWebhookHeaders(
                signature,
                timestamp,
                customHeaders
            );
            headers['X-Event-Type'] = eventType;

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
                // Make request
                const response = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                const responseTime = Date.now() - startTime;
                const responseBody = await response.text();

                if (response.ok) {
                    this.logger.info('Webhook delivered successfully', {
                        url,
                        statusCode: response.status,
                        responseTime,
                    });

                    return {
                        success: true,
                        statusCode: response.status,
                        responseBody,
                        responseTime,
                    };
                } else {
                    this.logger.warn('Webhook delivery failed with non-2xx status', {
                        url,
                        statusCode: response.status,
                        responseBody,
                        responseTime,
                    });

                    return {
                        success: false,
                        statusCode: response.status,
                        responseBody,
                        responseTime,
                        error: `HTTP ${response.status}: ${response.statusText}`,
                    };
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);

                const error = fetchError as Error;
                const responseTime = Date.now() - startTime;

                // Check if aborted (timeout)
                if (error.name === 'AbortError') {
                    this.logger.warn('Webhook delivery timeout', { url, timeout });

                    return {
                        success: false,
                        error: `Timeout after ${timeout}ms`,
                        responseTime,
                    };
                }

                this.logger.error('Webhook delivery network error', {
                    url,
                    error: error.message,
                });

                return {
                    success: false,
                    error: error.message,
                    responseTime,
                };
            }
        } catch (error) {
            const err = error as Error;
            this.logger.error('Webhook delivery error', {
                url,
                error: err.message,
            });

            return {
                success: false,
                error: err.message,
                responseTime: Date.now() - startTime,
            };
        }
    }

    /**
     * Retry webhook delivery with exponential backoff
     */
    async retryDelivery(
        webhook: Webhook,
        eventType: string,
        payload: object,
        attemptNumber: number
    ): Promise<DeliveryResult> {
        const maxRetries = webhook.maxRetries || 3;

        if (attemptNumber > maxRetries) {
            this.logger.warn('Max retries exceeded', {
                webhookId: webhook.id,
                attemptNumber,
                maxRetries,
            });

            return {
                success: false,
                error: `Max retries (${maxRetries}) exceeded`,
                responseTime: 0,
            };
        }

        // Calculate delay based on attempt number
        const delayIndex = Math.min(attemptNumber - 1, this.RETRY_DELAYS.length - 1);
        const delay = this.RETRY_DELAYS[delayIndex];

        this.logger.info('Retrying webhook delivery', {
            webhookId: webhook.id,
            attemptNumber,
            delay,
        });

        // Wait before retrying
        await this.sleep(delay);

        // Attempt delivery
        return await this.deliverWebhook(webhook, eventType, payload);
    }

    /**
     * Determine if error is retryable
     */
    shouldRetry(result: DeliveryResult): boolean {
        // Don't retry on success
        if (result.success) {
            return false;
        }

        // Don't retry 4xx errors (client errors)
        if (result.statusCode && result.statusCode >= 400 && result.statusCode < 500) {
            this.logger.debug('Not retrying 4xx error', {
                statusCode: result.statusCode,
            });
            return false;
        }

        // Retry on 5xx errors (server errors)
        if (result.statusCode && result.statusCode >= 500) {
            return true;
        }

        // Retry on network errors and timeouts
        if (
            result.error &&
            (result.error.includes('timeout') ||
                result.error.includes('network') ||
                result.error.includes('ECONNREFUSED') ||
                result.error.includes('ETIMEDOUT'))
        ) {
            return true;
        }

        // Don't retry unknown errors
        return false;
    }

    /**
     * Calculate next retry time
     */
    calculateNextRetry(attemptNumber: number): number {
        const delayIndex = Math.min(attemptNumber - 1, this.RETRY_DELAYS.length - 1);
        const delay = this.RETRY_DELAYS[delayIndex];

        return Date.now() + delay;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Test webhook delivery
     */
    async testWebhook(webhook: Webhook): Promise<DeliveryResult> {
        const testPayload = {
            test: true,
            timestamp: Date.now(),
            webhookId: webhook.id,
            message: 'This is a test webhook delivery',
        };

        return await this.deliverWebhook(webhook, 'test', testPayload);
    }
}
