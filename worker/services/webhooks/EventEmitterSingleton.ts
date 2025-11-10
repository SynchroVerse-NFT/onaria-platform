/**
 * EventEmitter Singleton - Provides a single instance of EventEmitter
 *
 * Usage:
 * - getEventEmitter() - Get or create the singleton instance
 * - emitEvent() - Helper to emit an event without managing the instance
 */

import { EventEmitter, WorkflowEventType } from './EventEmitter';
import { Database } from '../../database/database';

let eventEmitterInstance: EventEmitter | null = null;

/**
 * Get the singleton EventEmitter instance
 * Creates a new instance if one doesn't exist
 */
export function getEventEmitter(env: Env, db: Database): EventEmitter {
    if (!eventEmitterInstance) {
        eventEmitterInstance = new EventEmitter(env, db);
    }
    return eventEmitterInstance;
}

/**
 * Helper function to emit an event
 * Automatically manages the singleton instance
 */
export async function emitEvent(
    env: Env,
    db: Database,
    userId: string,
    eventType: WorkflowEventType,
    data: Record<string, unknown>
): Promise<void> {
    const emitter = getEventEmitter(env, db);
    await emitter.emit(userId, eventType, data);
}

/**
 * Helper function to trigger workflows
 * Automatically manages the singleton instance
 */
export async function triggerWorkflows(
    env: Env,
    db: Database,
    userId: string,
    eventType: WorkflowEventType,
    data: Record<string, unknown>
): Promise<void> {
    const emitter = getEventEmitter(env, db);
    await emitter.triggerWorkflows(userId, eventType, data);
}

/**
 * Reset the singleton instance (mainly for testing)
 */
export function resetEventEmitter(): void {
    eventEmitterInstance = null;
}
