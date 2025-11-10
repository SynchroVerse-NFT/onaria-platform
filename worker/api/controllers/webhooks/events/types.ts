/**
 * Type definitions for Webhook Events Controller responses
 */

/**
 * Response data for emitting an event
 */
export interface EventEmitData {
    webhooksTriggered: number;
    message: string;
}
