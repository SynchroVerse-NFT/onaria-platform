/**
 * Workflow Database Service
 * Handles all database operations for workflows
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { BaseService } from './BaseService';
import {
    workflows,
    workflowInstances,
    workflowExecutions,
    type Workflow,
    type WorkflowInstance,
    type WorkflowExecution,
    type NewWorkflow,
    type NewWorkflowInstance,
    type NewWorkflowExecution,
} from '../schema';

export class WorkflowDBService extends BaseService {
    // Workflow Templates

    /**
     * Create a new workflow template
     */
    async createWorkflow(data: NewWorkflow): Promise<Workflow> {
        try {
            const [workflow] = await this.database
                .insert(workflows)
                .values(data)
                .returning();

            this.logger.info('Workflow template created', { workflowId: workflow.id });
            return workflow;
        } catch (error) {
            this.handleDatabaseError(error, 'createWorkflow', { data });
        }
    }

    /**
     * Get workflow by ID
     */
    async getWorkflow(workflowId: string): Promise<Workflow | null> {
        try {
            const [workflow] = await this.database
                .select()
                .from(workflows)
                .where(eq(workflows.id, workflowId))
                .limit(1);

            return workflow || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getWorkflow', { workflowId });
        }
    }

    /**
     * Get all workflow templates
     */
    async getWorkflowTemplates(): Promise<Workflow[]> {
        try {
            const templates = await this.database
                .select()
                .from(workflows)
                .where(eq(workflows.isTemplate, true))
                .orderBy(desc(workflows.createdAt));

            return templates;
        } catch (error) {
            this.handleDatabaseError(error, 'getWorkflowTemplates', {});
        }
    }

    /**
     * Get public workflow templates
     */
    async getPublicWorkflows(): Promise<Workflow[]> {
        try {
            const publicWorkflows = await this.database
                .select()
                .from(workflows)
                .where(
                    and(
                        eq(workflows.isTemplate, true),
                        eq(workflows.isPublic, true),
                        eq(workflows.isActive, true)
                    )
                )
                .orderBy(desc(workflows.createdAt));

            return publicWorkflows;
        } catch (error) {
            this.handleDatabaseError(error, 'getPublicWorkflows', {});
        }
    }

    /**
     * Get workflows by category
     */
    async getWorkflowsByCategory(category: string): Promise<Workflow[]> {
        try {
            const workflows_by_category = await this.database
                .select()
                .from(workflows)
                .where(
                    and(
                        eq(workflows.category, category),
                        eq(workflows.isPublic, true),
                        eq(workflows.isActive, true)
                    )
                )
                .orderBy(desc(workflows.createdAt));

            return workflows_by_category;
        } catch (error) {
            this.handleDatabaseError(error, 'getWorkflowsByCategory', { category });
        }
    }

    /**
     * Update workflow
     */
    async updateWorkflow(workflowId: string, data: Partial<Workflow>): Promise<Workflow> {
        try {
            const [workflow] = await this.database
                .update(workflows)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(eq(workflows.id, workflowId))
                .returning();

            this.logger.info('Workflow updated', { workflowId });
            return workflow;
        } catch (error) {
            this.handleDatabaseError(error, 'updateWorkflow', { workflowId, data });
        }
    }

    /**
     * Delete workflow
     */
    async deleteWorkflow(workflowId: string): Promise<void> {
        try {
            await this.database
                .delete(workflows)
                .where(eq(workflows.id, workflowId));

            this.logger.info('Workflow deleted', { workflowId });
        } catch (error) {
            this.handleDatabaseError(error, 'deleteWorkflow', { workflowId });
        }
    }

    // Workflow Instances

    /**
     * Create a new workflow instance
     */
    async createInstance(data: NewWorkflowInstance): Promise<WorkflowInstance> {
        try {
            const [instance] = await this.database
                .insert(workflowInstances)
                .values(data)
                .returning();

            this.logger.info('Workflow instance created', { instanceId: instance.id });
            return instance;
        } catch (error) {
            this.handleDatabaseError(error, 'createInstance', { data });
        }
    }

    /**
     * Get workflow instance by ID
     */
    async getInstance(instanceId: string): Promise<WorkflowInstance | null> {
        try {
            const [instance] = await this.database
                .select()
                .from(workflowInstances)
                .where(eq(workflowInstances.id, instanceId))
                .limit(1);

            return instance || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getInstance', { instanceId });
        }
    }

    /**
     * Get workflow instance by n8n workflow ID
     */
    async getInstanceByN8nId(n8nWorkflowId: string): Promise<WorkflowInstance | null> {
        try {
            const [instance] = await this.database
                .select()
                .from(workflowInstances)
                .where(eq(workflowInstances.n8nWorkflowId, n8nWorkflowId))
                .limit(1);

            return instance || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getInstanceByN8nId', { n8nWorkflowId });
        }
    }

    /**
     * Get all workflow instances for a user
     */
    async getUserInstances(userId: string): Promise<WorkflowInstance[]> {
        try {
            const instances = await this.database
                .select()
                .from(workflowInstances)
                .where(eq(workflowInstances.userId, userId))
                .orderBy(desc(workflowInstances.createdAt));

            return instances;
        } catch (error) {
            this.handleDatabaseError(error, 'getUserInstances', { userId });
        }
    }

    /**
     * Get active instances for a user
     */
    async getActiveInstances(userId: string): Promise<WorkflowInstance[]> {
        try {
            const instances = await this.database
                .select()
                .from(workflowInstances)
                .where(
                    and(
                        eq(workflowInstances.userId, userId),
                        eq(workflowInstances.status, 'active')
                    )
                )
                .orderBy(desc(workflowInstances.createdAt));

            return instances;
        } catch (error) {
            this.handleDatabaseError(error, 'getActiveInstances', { userId });
        }
    }

    /**
     * Update workflow instance
     */
    async updateInstance(
        instanceId: string,
        data: Partial<WorkflowInstance>
    ): Promise<WorkflowInstance> {
        try {
            const [instance] = await this.database
                .update(workflowInstances)
                .set({
                    ...data,
                    updatedAt: new Date(),
                })
                .where(eq(workflowInstances.id, instanceId))
                .returning();

            this.logger.info('Workflow instance updated', { instanceId });
            return instance;
        } catch (error) {
            this.handleDatabaseError(error, 'updateInstance', { instanceId, data });
        }
    }

    /**
     * Update instance execution statistics
     */
    async updateInstanceStats(
        instanceId: string,
        success: boolean
    ): Promise<void> {
        try {
            await this.database
                .update(workflowInstances)
                .set({
                    lastExecutedAt: new Date(),
                    executionCount: sql`${workflowInstances.executionCount} + 1`,
                    ...(success
                        ? { errorCount: 0, lastError: null }
                        : { errorCount: sql`${workflowInstances.errorCount} + 1` }),
                })
                .where(eq(workflowInstances.id, instanceId));
        } catch (error) {
            this.handleDatabaseError(error, 'updateInstanceStats', {
                instanceId,
                success,
            });
        }
    }

    /**
     * Delete workflow instance
     */
    async deleteInstance(instanceId: string): Promise<void> {
        try {
            await this.database
                .delete(workflowInstances)
                .where(eq(workflowInstances.id, instanceId));

            this.logger.info('Workflow instance deleted', { instanceId });
        } catch (error) {
            this.handleDatabaseError(error, 'deleteInstance', { instanceId });
        }
    }

    // Workflow Executions

    /**
     * Create workflow execution record
     */
    async createExecution(data: NewWorkflowExecution): Promise<WorkflowExecution> {
        try {
            const [execution] = await this.database
                .insert(workflowExecutions)
                .values(data)
                .returning();

            return execution;
        } catch (error) {
            this.handleDatabaseError(error, 'createExecution', { data });
        }
    }

    /**
     * Get execution by ID
     */
    async getExecution(executionId: string): Promise<WorkflowExecution | null> {
        try {
            const [execution] = await this.database
                .select()
                .from(workflowExecutions)
                .where(eq(workflowExecutions.id, executionId))
                .limit(1);

            return execution || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getExecution', { executionId });
        }
    }

    /**
     * Get executions for a workflow instance
     */
    async getInstanceExecutions(
        instanceId: string,
        limit = 50
    ): Promise<WorkflowExecution[]> {
        try {
            const executions = await this.database
                .select()
                .from(workflowExecutions)
                .where(eq(workflowExecutions.instanceId, instanceId))
                .orderBy(desc(workflowExecutions.startedAt))
                .limit(limit);

            return executions;
        } catch (error) {
            this.handleDatabaseError(error, 'getInstanceExecutions', {
                instanceId,
                limit,
            });
        }
    }

    /**
     * Update execution
     */
    async updateExecution(
        executionId: string,
        data: Partial<WorkflowExecution>
    ): Promise<WorkflowExecution> {
        try {
            const [execution] = await this.database
                .update(workflowExecutions)
                .set(data)
                .where(eq(workflowExecutions.id, executionId))
                .returning();

            return execution;
        } catch (error) {
            this.handleDatabaseError(error, 'updateExecution', { executionId, data });
        }
    }

    /**
     * Get recent executions for a user
     */
    async getUserExecutions(
        userId: string,
        limit = 50
    ): Promise<WorkflowExecution[]> {
        try {
            const executions = await this.database
                .select()
                .from(workflowExecutions)
                .innerJoin(
                    workflowInstances,
                    eq(workflowExecutions.instanceId, workflowInstances.id)
                )
                .where(eq(workflowInstances.userId, userId))
                .orderBy(desc(workflowExecutions.startedAt))
                .limit(limit);

            return executions.map((row) => row.workflow_executions);
        } catch (error) {
            this.handleDatabaseError(error, 'getUserExecutions', { userId, limit });
        }
    }

    /**
     * Clean up old executions
     */
    async cleanupOldExecutions(
        maxAge: number = 30 * 24 * 60 * 60 * 1000
    ): Promise<number> {
        try {
            const cutoffDate = new Date(Date.now() - maxAge);

            const result = await this.database
                .delete(workflowExecutions)
                .where(sql`${workflowExecutions.createdAt} < ${cutoffDate}`)
                .returning({ id: workflowExecutions.id });

            this.logger.info('Cleaned up old workflow executions', {
                count: result.length,
                cutoffDate,
            });

            return result.length;
        } catch (error) {
            this.handleDatabaseError(error, 'cleanupOldExecutions', { maxAge });
        }
    }
}
