/**
 * Webhook Service Types
 */

import type { Webhook, WebhookLog } from '../../database/schema';

export interface DeliveryResult {
    success: boolean;
    statusCode?: number;
    responseBody?: string;
    responseTime: number;
    error?: string;
}

export interface QueuedWebhook {
    webhookId: string;
    eventType: string;
    payload: object;
    attemptNumber: number;
    scheduledAt: number;
}

export interface QueueStatus {
    pending: number;
    processing: number;
    failed: number;
    succeeded: number;
}

export interface CreateWebhookData {
    name: string;
    description?: string;
    url: string;
    events: string[];
    filters?: Record<string, unknown>;
    timeout?: number;
    retryEnabled?: boolean;
    maxRetries?: number;
    customHeaders?: Record<string, string>;
}

export interface UpdateWebhookData {
    name?: string;
    description?: string;
    url?: string;
    events?: string[];
    filters?: Record<string, unknown>;
    timeout?: number;
    retryEnabled?: boolean;
    maxRetries?: number;
    customHeaders?: Record<string, string>;
    isActive?: boolean;
}

export type WebhookWithLogs = Webhook & {
    recentLogs?: WebhookLog[];
};
