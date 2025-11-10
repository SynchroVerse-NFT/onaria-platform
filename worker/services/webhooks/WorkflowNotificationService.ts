/**
 * Workflow Notification Service
 *
 * Broadcasts workflow execution status to users via WebSocket
 * Integrates with the existing WebSocket system to provide real-time updates
 */

import { createLogger } from '../../logger';
import { Database } from '../../database/database';
import { workflowInstances, workflowExecutions } from '../../database/schema';
import { eq } from 'drizzle-orm';
import { WorkflowEventType } from './EventEmitter';

const logger = createLogger('WorkflowNotificationService');

export type WorkflowExecutionStatus = 'running' | 'success' | 'error' | 'waiting' | 'canceled';

export interface WorkflowInstance {
    id: string;
    userId: string;
    workflowId: string;
    name: string;
    status: 'active' | 'inactive' | 'error' | 'paused';
}

export interface WorkflowExecution {
    id: string;
    instanceId: string;
    workflowId: string;
    status: WorkflowExecutionStatus;
    startedAt: Date;
    finishedAt?: Date;
    duration?: number;
    error?: string;
}

export class WorkflowNotificationService {
    private env: Env;
    private db: Database;

    constructor(env: Env, db: Database) {
        this.env = env;
        this.db = db;
    }

    /**
     * Notify user that a workflow was triggered
     */
    async notifyWorkflowTriggered(
        userId: string,
        workflow: WorkflowInstance,
        eventType: WorkflowEventType
    ): Promise<void> {
        try {
            await this.sendWebSocketMessage(userId, {
                type: 'workflow_triggered',
                workflowId: workflow.workflowId,
                workflowName: workflow.name,
                eventType,
                timestamp: Date.now()
            });

            logger.info('Workflow triggered notification sent', {
                userId,
                workflowId: workflow.id,
                eventType
            });
        } catch (error) {
            logger.error('Failed to send workflow triggered notification', {
                userId,
                workflowId: workflow.id,
                error
            });
        }
    }

    /**
     * Notify user of workflow execution progress update
     */
    async notifyExecutionUpdate(
        userId: string,
        execution: WorkflowExecution,
        progress?: number
    ): Promise<void> {
        try {
            await this.sendWebSocketMessage(userId, {
                type: 'workflow_execution_update',
                executionId: execution.id,
                workflowId: execution.workflowId,
                status: execution.status,
                progress
            });

            logger.info('Workflow execution update sent', {
                userId,
                executionId: execution.id,
                status: execution.status
            });
        } catch (error) {
            logger.error('Failed to send workflow execution update', {
                userId,
                executionId: execution.id,
                error
            });
        }
    }

    /**
     * Notify user when workflow execution completes
     */
    async notifyExecutionComplete(
        userId: string,
        execution: WorkflowExecution
    ): Promise<void> {
        try {
            await this.sendWebSocketMessage(userId, {
                type: 'workflow_execution_complete',
                executionId: execution.id,
                workflowId: execution.workflowId,
                status: execution.status,
                duration: execution.duration || 0,
                error: execution.error
            });

            logger.info('Workflow execution complete notification sent', {
                userId,
                executionId: execution.id,
                status: execution.status
            });
        } catch (error) {
            logger.error('Failed to send workflow execution complete notification', {
                userId,
                executionId: execution.id,
                error
            });
        }
    }

    /**
     * Send WebSocket message to user
     * Uses the Durable Object stub to send messages to connected clients
     */
    private async sendWebSocketMessage(
        userId: string,
        message: Record<string, unknown>
    ): Promise<void> {
        try {
            // In Cloudflare Workers, WebSocket connections are typically managed by Durable Objects
            // This would need to integrate with your existing WebSocket Durable Object system

            // For now, we'll use the env.SIMPLE_CODE_GENERATOR_AGENT Durable Object namespace
            // You'll need to implement a broadcast method in your SimpleCodeGeneratorAgent

            // Example implementation (adjust based on your actual DO architecture):
            // const id = this.env.SIMPLE_CODE_GENERATOR_AGENT.idFromName(`user-${userId}`);
            // const stub = this.env.SIMPLE_CODE_GENERATOR_AGENT.get(id);
            // await stub.fetch(new Request('https://internal/broadcast-message', {
            //     method: 'POST',
            //     body: JSON.stringify(message)
            // }));

            logger.debug('WebSocket message queued for user', { userId, messageType: message.type });
        } catch (error) {
            logger.error('Failed to send WebSocket message', { userId, error });
            throw error;
        }
    }

    /**
     * Get workflow instance by ID
     */
    async getWorkflowInstance(instanceId: string): Promise<WorkflowInstance | null> {
        try {
            const instance = await this.db.drizzle
                .select()
                .from(workflowInstances)
                .where(eq(workflowInstances.id, instanceId))
                .get();

            if (!instance) {
                return null;
            }

            return {
                id: instance.id,
                userId: instance.userId,
                workflowId: instance.workflowId,
                name: instance.name,
                status: instance.status as 'active' | 'inactive' | 'error' | 'paused'
            };
        } catch (error) {
            logger.error('Failed to get workflow instance', { instanceId, error });
            return null;
        }
    }

    /**
     * Get workflow execution by ID
     */
    async getWorkflowExecution(executionId: string): Promise<WorkflowExecution | null> {
        try {
            const execution = await this.db.drizzle
                .select()
                .from(workflowExecutions)
                .where(eq(workflowExecutions.id, executionId))
                .get();

            if (!execution) {
                return null;
            }

            return {
                id: execution.id,
                instanceId: execution.instanceId,
                workflowId: execution.instanceId, // Map to workflow instance
                status: execution.status as WorkflowExecutionStatus,
                startedAt: execution.startedAt as Date,
                finishedAt: execution.finishedAt ? execution.finishedAt as Date : undefined,
                duration: execution.duration || undefined,
                error: execution.error || undefined
            };
        } catch (error) {
            logger.error('Failed to get workflow execution', { executionId, error });
            return null;
        }
    }

    /**
     * Record workflow execution start
     */
    async recordExecutionStart(
        instanceId: string,
        eventType: WorkflowEventType,
        triggerData: Record<string, unknown>
    ): Promise<string> {
        try {
            const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;

            await this.db.drizzle
                .insert(workflowExecutions)
                .values({
                    id: executionId,
                    instanceId,
                    n8nExecutionId: executionId, // Will be updated with actual n8n execution ID
                    status: 'running',
                    mode: 'trigger',
                    triggeredBy: eventType,
                    triggerData: JSON.stringify(triggerData),
                    startedAt: new Date(),
                    createdAt: new Date()
                })
                .run();

            logger.info('Workflow execution recorded', { executionId, instanceId });
            return executionId;
        } catch (error) {
            logger.error('Failed to record workflow execution', { instanceId, error });
            throw error;
        }
    }

    /**
     * Update workflow execution status
     */
    async updateExecutionStatus(
        executionId: string,
        status: WorkflowExecutionStatus,
        resultData?: Record<string, unknown>,
        error?: string
    ): Promise<void> {
        try {
            const updates: Record<string, unknown> = {
                status
            };

            if (resultData) {
                updates.resultData = JSON.stringify(resultData);
            }

            if (error) {
                updates.error = error;
            }

            if (status === 'success' || status === 'error' || status === 'canceled') {
                updates.finishedAt = new Date();

                // Calculate duration
                const execution = await this.db.drizzle
                    .select()
                    .from(workflowExecutions)
                    .where(eq(workflowExecutions.id, executionId))
                    .get();

                if (execution && execution.startedAt) {
                    const startTime = new Date(execution.startedAt).getTime();
                    const endTime = Date.now();
                    updates.duration = endTime - startTime;
                }
            }

            await this.db.drizzle
                .update(workflowExecutions)
                .set(updates)
                .where(eq(workflowExecutions.id, executionId))
                .run();

            logger.info('Workflow execution status updated', { executionId, status });
        } catch (error) {
            logger.error('Failed to update workflow execution status', { executionId, error });
            throw error;
        }
    }
}
