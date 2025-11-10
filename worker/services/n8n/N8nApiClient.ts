/**
 * n8n API Client
 * Handles all interactions with n8n REST API
 */

import { createLogger } from '../../logger';
import type {
    N8nWorkflow,
    N8nExecution,
    N8nWorkflowsListResponse,
    N8nExecutionsListResponse,
    N8nApiError,
} from './types';

export class N8nApiClient {
    private logger = createLogger('N8nApiClient');
    private baseUrl: string;
    private apiKey: string;

    constructor(baseUrl: string, apiKey: string) {
        this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = apiKey;
    }

    /**
     * Make authenticated request to n8n API
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': this.apiKey,
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const error = await response.text();
                this.logger.error('n8n API request failed', {
                    status: response.status,
                    statusText: response.statusText,
                    error,
                });

                const apiError: N8nApiError = {
                    message: error || response.statusText,
                    code: response.status,
                    httpStatusCode: response.status,
                };

                throw apiError;
            }

            return await response.json();
        } catch (error) {
            this.logger.error('n8n API request error', { error, endpoint });
            throw error;
        }
    }

    // Workflow Management

    /**
     * Create a new workflow in n8n
     */
    async createWorkflow(workflow: N8nWorkflow): Promise<{ id: string }> {
        this.logger.info('Creating workflow', { name: workflow.name });

        const response = await this.request<N8nWorkflow>('/api/v1/workflows', {
            method: 'POST',
            body: JSON.stringify(workflow),
        });

        return { id: response.id! };
    }

    /**
     * Get workflow details
     */
    async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
        this.logger.debug('Getting workflow', { workflowId });

        return await this.request<N8nWorkflow>(`/api/v1/workflows/${workflowId}`);
    }

    /**
     * Update an existing workflow
     */
    async updateWorkflow(
        workflowId: string,
        workflow: Partial<N8nWorkflow>
    ): Promise<void> {
        this.logger.info('Updating workflow', { workflowId });

        await this.request<N8nWorkflow>(`/api/v1/workflows/${workflowId}`, {
            method: 'PATCH',
            body: JSON.stringify(workflow),
        });
    }

    /**
     * Delete a workflow
     */
    async deleteWorkflow(workflowId: string): Promise<void> {
        this.logger.info('Deleting workflow', { workflowId });

        await this.request<void>(`/api/v1/workflows/${workflowId}`, {
            method: 'DELETE',
        });
    }

    /**
     * Activate a workflow
     */
    async activateWorkflow(workflowId: string): Promise<void> {
        this.logger.info('Activating workflow', { workflowId });

        await this.request<N8nWorkflow>(`/api/v1/workflows/${workflowId}`, {
            method: 'PATCH',
            body: JSON.stringify({ active: true }),
        });
    }

    /**
     * Deactivate a workflow
     */
    async deactivateWorkflow(workflowId: string): Promise<void> {
        this.logger.info('Deactivating workflow', { workflowId });

        await this.request<N8nWorkflow>(`/api/v1/workflows/${workflowId}`, {
            method: 'PATCH',
            body: JSON.stringify({ active: false }),
        });
    }

    /**
     * List all workflows
     */
    async listWorkflows(limit = 100): Promise<N8nWorkflow[]> {
        this.logger.debug('Listing workflows', { limit });

        const response = await this.request<N8nWorkflowsListResponse>(
            `/api/v1/workflows?limit=${limit}`
        );

        return response.data;
    }

    // Execution Management

    /**
     * Get execution details
     */
    async getExecution(executionId: string): Promise<N8nExecution> {
        this.logger.debug('Getting execution', { executionId });

        return await this.request<N8nExecution>(`/api/v1/executions/${executionId}`);
    }

    /**
     * List executions for a workflow
     */
    async getExecutions(
        workflowId: string,
        limit = 20
    ): Promise<N8nExecution[]> {
        this.logger.debug('Getting executions', { workflowId, limit });

        const response = await this.request<N8nExecutionsListResponse>(
            `/api/v1/executions?workflowId=${workflowId}&limit=${limit}`
        );

        return response.data;
    }

    /**
     * Retry a failed execution
     */
    async retryExecution(executionId: string): Promise<void> {
        this.logger.info('Retrying execution', { executionId });

        await this.request<N8nExecution>(`/api/v1/executions/${executionId}/retry`, {
            method: 'POST',
        });
    }

    /**
     * Delete an execution
     */
    async deleteExecution(executionId: string): Promise<void> {
        this.logger.info('Deleting execution', { executionId });

        await this.request<void>(`/api/v1/executions/${executionId}`, {
            method: 'DELETE',
        });
    }

    // Webhook Management

    /**
     * Get webhook URL for a workflow
     * Note: This extracts webhook URLs from workflow nodes
     */
    async getWebhookUrl(workflowId: string): Promise<string | null> {
        this.logger.debug('Getting webhook URL', { workflowId });

        const workflow = await this.getWorkflow(workflowId);

        // Find webhook nodes
        const webhookNode = workflow.nodes.find(
            (node) => node.type === 'n8n-nodes-base.webhook'
        );

        if (!webhookNode) {
            this.logger.warn('No webhook node found in workflow', { workflowId });
            return null;
        }

        // Extract webhook path from node parameters
        const path = webhookNode.parameters.path as string;
        if (!path) {
            return null;
        }

        // Construct full webhook URL
        return `${this.baseUrl}/webhook/${path}`;
    }

    /**
     * Test webhook URL by making a test request
     */
    async testWebhook(
        webhookUrl: string,
        testPayload: Record<string, unknown> = {}
    ): Promise<boolean> {
        this.logger.debug('Testing webhook', { webhookUrl });

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testPayload),
            });

            return response.ok;
        } catch (error) {
            this.logger.error('Webhook test failed', { error, webhookUrl });
            return false;
        }
    }

    /**
     * Execute a workflow manually
     */
    async executeWorkflow(
        workflowId: string,
        data?: Record<string, unknown>
    ): Promise<N8nExecution> {
        this.logger.info('Executing workflow', { workflowId });

        return await this.request<N8nExecution>(
            `/api/v1/workflows/${workflowId}/execute`,
            {
                method: 'POST',
                body: JSON.stringify({ data }),
            }
        );
    }

    /**
     * Health check - verify n8n connection
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.request('/healthz');
            return true;
        } catch (error) {
            this.logger.error('n8n health check failed', { error });
            return false;
        }
    }
}
