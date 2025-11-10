/**
 * n8n Workflow Service
 * Manages workflow lifecycle in n8n
 */

import { createLogger } from '../../logger';
import { N8nApiClient } from './N8nApiClient';
import { WorkflowDBService } from '../../database/services/WorkflowDBService';
import type { WorkflowInstance, WorkflowExecution } from '../../database/schema';
import type { N8nWorkflow, N8nExecution } from './types';

export interface WorkflowConfig {
    name: string;
    config?: Record<string, unknown>;
}

export interface WorkflowStatus {
    id: string;
    name: string;
    status: 'active' | 'inactive' | 'error' | 'paused';
    n8nWorkflowId: string;
    isActive: boolean;
    lastExecutedAt: Date | null;
    executionCount: number;
    errorCount: number;
}

export class N8nWorkflowService {
    private logger = createLogger('N8nWorkflowService');
    private n8nClient: N8nApiClient;
    private dbService: WorkflowDBService;
    private env: Env;

    constructor(env: Env) {
        this.env = env;
        this.n8nClient = new N8nApiClient(
            env.N8N_API_URL || '',
            env.N8N_API_KEY || ''
        );
        this.dbService = new WorkflowDBService(env);
    }

    /**
     * Create workflow instance from template
     */
    async createFromTemplate(
        userId: string,
        templateId: string,
        config: WorkflowConfig
    ): Promise<WorkflowInstance> {
        this.logger.info('Creating workflow from template', {
            userId,
            templateId,
            name: config.name,
        });

        // Get workflow template
        const template = await this.dbService.getWorkflow(templateId);
        if (!template) {
            throw new Error('Workflow template not found');
        }

        if (!template.isTemplate) {
            throw new Error('Workflow is not a template');
        }

        // Parse template data
        const templateData = JSON.parse(template.templateData as string) as N8nWorkflow;

        // Customize workflow with user config
        const workflowData: N8nWorkflow = {
            ...templateData,
            name: config.name,
            // Inject user-specific configuration
            settings: {
                ...templateData.settings,
                ...config.config,
            },
        };

        // Create workflow in n8n
        const n8nResult = await this.n8nClient.createWorkflow(workflowData);

        // Get webhook URL if workflow has webhooks
        const webhookUrl = await this.n8nClient.getWebhookUrl(n8nResult.id);

        // Create workflow instance in database
        const instance = await this.dbService.createInstance({
            id: crypto.randomUUID(),
            userId,
            workflowId: templateId,
            n8nWorkflowId: n8nResult.id,
            n8nWebhookUrl: webhookUrl,
            name: config.name,
            config: JSON.stringify(config.config || {}),
            status: 'inactive',
            lastExecutedAt: null,
            executionCount: 0,
            errorCount: 0,
            lastError: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            activatedAt: null,
            deactivatedAt: null,
        });

        this.logger.info('Workflow instance created', {
            instanceId: instance.id,
            n8nWorkflowId: n8nResult.id,
        });

        return instance;
    }

    /**
     * Activate workflow
     */
    async activateWorkflow(instanceId: string): Promise<void> {
        this.logger.info('Activating workflow', { instanceId });

        const instance = await this.dbService.getInstance(instanceId);
        if (!instance) {
            throw new Error('Workflow instance not found');
        }

        // Activate in n8n
        await this.n8nClient.activateWorkflow(instance.n8nWorkflowId);

        // Update database
        await this.dbService.updateInstance(instanceId, {
            status: 'active',
            activatedAt: new Date(),
        });

        this.logger.info('Workflow activated', { instanceId });
    }

    /**
     * Deactivate workflow
     */
    async deactivateWorkflow(instanceId: string): Promise<void> {
        this.logger.info('Deactivating workflow', { instanceId });

        const instance = await this.dbService.getInstance(instanceId);
        if (!instance) {
            throw new Error('Workflow instance not found');
        }

        // Deactivate in n8n
        await this.n8nClient.deactivateWorkflow(instance.n8nWorkflowId);

        // Update database
        await this.dbService.updateInstance(instanceId, {
            status: 'inactive',
            deactivatedAt: new Date(),
        });

        this.logger.info('Workflow deactivated', { instanceId });
    }

    /**
     * Delete workflow
     */
    async deleteWorkflow(instanceId: string): Promise<void> {
        this.logger.info('Deleting workflow', { instanceId });

        const instance = await this.dbService.getInstance(instanceId);
        if (!instance) {
            throw new Error('Workflow instance not found');
        }

        // Delete from n8n
        await this.n8nClient.deleteWorkflow(instance.n8nWorkflowId);

        // Delete from database
        await this.dbService.deleteInstance(instanceId);

        this.logger.info('Workflow deleted', { instanceId });
    }

    /**
     * Get workflow status
     */
    async getWorkflowStatus(instanceId: string): Promise<WorkflowStatus> {
        const instance = await this.dbService.getInstance(instanceId);
        if (!instance) {
            throw new Error('Workflow instance not found');
        }

        // Get status from n8n
        const n8nWorkflow = await this.n8nClient.getWorkflow(instance.n8nWorkflowId);

        return {
            id: instance.id,
            name: instance.name,
            status: instance.status,
            n8nWorkflowId: instance.n8nWorkflowId,
            isActive: n8nWorkflow.active || false,
            lastExecutedAt: instance.lastExecutedAt,
            executionCount: instance.executionCount,
            errorCount: instance.errorCount,
        };
    }

    /**
     * Get execution history
     */
    async getExecutionHistory(
        instanceId: string,
        limit = 20
    ): Promise<WorkflowExecution[]> {
        return await this.dbService.getInstanceExecutions(instanceId, limit);
    }

    /**
     * Retry execution
     */
    async retryExecution(executionId: string): Promise<void> {
        this.logger.info('Retrying execution', { executionId });

        const execution = await this.dbService.getExecution(executionId);
        if (!execution) {
            throw new Error('Execution not found');
        }

        // Retry in n8n
        await this.n8nClient.retryExecution(execution.n8nExecutionId);

        // Update database
        await this.dbService.updateExecution(executionId, {
            status: 'running',
        });

        this.logger.info('Execution retry initiated', { executionId });
    }

    /**
     * Sync execution from n8n
     */
    async syncExecution(
        instanceId: string,
        n8nExecutionId: string
    ): Promise<WorkflowExecution> {
        this.logger.debug('Syncing execution from n8n', {
            instanceId,
            n8nExecutionId,
        });

        const instance = await this.dbService.getInstance(instanceId);
        if (!instance) {
            throw new Error('Workflow instance not found');
        }

        // Get execution from n8n
        const n8nExecution = await this.n8nClient.getExecution(n8nExecutionId);

        // Map n8n execution to our format
        const status = this.mapN8nExecutionStatus(n8nExecution);
        const duration = n8nExecution.stoppedAt
            ? new Date(n8nExecution.stoppedAt).getTime() -
              new Date(n8nExecution.startedAt).getTime()
            : null;

        // Create or update execution in database
        const execution = await this.dbService.createExecution({
            id: crypto.randomUUID(),
            instanceId,
            n8nExecutionId: n8nExecution.id,
            status,
            mode: n8nExecution.mode,
            triggeredBy: n8nExecution.mode,
            triggerData: JSON.stringify({}),
            resultData: n8nExecution.data
                ? JSON.stringify(n8nExecution.data.resultData)
                : null,
            error: n8nExecution.data?.resultData?.error?.message || null,
            startedAt: new Date(n8nExecution.startedAt),
            finishedAt: n8nExecution.stoppedAt
                ? new Date(n8nExecution.stoppedAt)
                : null,
            duration,
            createdAt: new Date(),
        });

        // Update instance statistics
        await this.dbService.updateInstanceStats(instanceId, status === 'success');

        return execution;
    }

    /**
     * Execute workflow manually
     */
    async executeWorkflow(
        instanceId: string,
        data?: Record<string, unknown>
    ): Promise<WorkflowExecution> {
        this.logger.info('Executing workflow manually', { instanceId });

        const instance = await this.dbService.getInstance(instanceId);
        if (!instance) {
            throw new Error('Workflow instance not found');
        }

        // Execute in n8n
        const n8nExecution = await this.n8nClient.executeWorkflow(
            instance.n8nWorkflowId,
            data
        );

        // Sync execution to database
        return await this.syncExecution(instanceId, n8nExecution.id);
    }

    /**
     * Map n8n execution status to our status
     */
    private mapN8nExecutionStatus(
        execution: N8nExecution
    ): 'running' | 'success' | 'error' | 'waiting' | 'canceled' {
        if (!execution.finished) {
            return 'running';
        }

        if (execution.data?.resultData?.error) {
            return 'error';
        }

        return 'success';
    }

    /**
     * Get workflow templates
     */
    async getWorkflowTemplates(): Promise<Array<{
        id: string;
        name: string;
        description: string | null;
        category: string;
        iconUrl: string | null;
    }>> {
        const templates = await this.dbService.getWorkflowTemplates();

        return templates.map((template) => ({
            id: template.id,
            name: template.name,
            description: template.description,
            category: template.category,
            iconUrl: template.iconUrl,
        }));
    }

    /**
     * Get user's workflow instances
     */
    async getUserWorkflows(userId: string): Promise<WorkflowInstance[]> {
        return await this.dbService.getUserInstances(userId);
    }

    /**
     * Health check - verify n8n connection
     */
    async healthCheck(): Promise<boolean> {
        return await this.n8nClient.healthCheck();
    }
}
