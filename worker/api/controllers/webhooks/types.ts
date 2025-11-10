/**
 * Type definitions for Webhook Controller responses
 */

import type { Webhook, WebhookLog, DeliveryResult } from '../../../../src/api-types';

/**
 * Response data for creating a webhook (includes secret shown only once)
 */
export interface WebhookCreateData {
    webhook: Webhook;
    secret: string;
    message: string;
}

/**
 * Response data for listing webhooks
 */
export interface WebhooksListData {
    webhooks: Webhook[];
}

/**
 * Response data for getting a single webhook
 */
export interface WebhookData {
    webhook: Webhook;
}

/**
 * Response data for updating a webhook
 */
export interface WebhookUpdateData {
    webhook: Webhook;
    message: string;
}

/**
 * Response data for deleting a webhook
 */
export interface WebhookDeleteData {
    success: boolean;
    message: string;
}

/**
 * Response data for testing a webhook
 */
export interface WebhookTestData {
    success: boolean;
    response: DeliveryResult;
    message: string;
}

/**
 * Response data for regenerating webhook secret
 */
export interface WebhookRegenerateSecretData {
    webhook: Webhook;
    newSecret: string;
    message: string;
}

/**
 * Response data for webhook logs
 */
export interface WebhookLogsData {
    logs: WebhookLog[];
    total: number;
}
