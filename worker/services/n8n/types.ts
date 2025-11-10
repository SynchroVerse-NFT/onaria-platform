/**
 * n8n API Types
 * Types for interacting with n8n REST API
 */

export interface N8nWorkflowNode {
    name: string;
    type: string;
    position: [number, number];
    parameters: Record<string, unknown>;
    credentials?: Record<string, unknown>;
}

export interface N8nWorkflowConnection {
    node: string;
    type: string;
    index: number;
}

export interface N8nWorkflow {
    id?: string;
    name: string;
    active?: boolean;
    nodes: N8nWorkflowNode[];
    connections: Record<string, Record<string, N8nWorkflowConnection[][]>>;
    settings?: Record<string, unknown>;
    staticData?: Record<string, unknown>;
    tags?: string[];
}

export interface N8nExecution {
    id: string;
    workflowId: string;
    mode: 'manual' | 'trigger' | 'webhook' | 'retry';
    finished: boolean;
    retryOf?: string;
    retrySuccessId?: string;
    startedAt: string;
    stoppedAt?: string;
    workflowData?: N8nWorkflow;
    data?: {
        resultData: {
            runData: Record<string, unknown[]>;
            error?: {
                message: string;
                stack?: string;
            };
        };
    };
}

export interface N8nWebhookInfo {
    webhookId: string;
    path: string;
    method: string;
    node: string;
    webhookDescription?: string;
}

export interface N8nApiResponse<T> {
    data: T;
}

export interface N8nApiError {
    message: string;
    code?: number;
    httpStatusCode?: number;
}

export interface N8nWorkflowsListResponse {
    data: N8nWorkflow[];
    nextCursor?: string;
}

export interface N8nExecutionsListResponse {
    data: N8nExecution[];
    nextCursor?: string;
}

export interface WorkflowEventType {
    // Workflow lifecycle events
    'workflow.created': { workflowId: string; name: string };
    'workflow.updated': { workflowId: string; changes: string[] };
    'workflow.deleted': { workflowId: string };
    'workflow.activated': { workflowId: string };
    'workflow.deactivated': { workflowId: string };

    // Execution events
    'execution.started': { executionId: string; workflowId: string };
    'execution.completed': { executionId: string; workflowId: string; success: boolean };
    'execution.failed': { executionId: string; workflowId: string; error: string };

    // App events
    'app.created': { appId: string; title: string };
    'app.published': { appId: string };
    'app.updated': { appId: string; changes: string[] };
    'app.deleted': { appId: string };

    // User events
    'user.registered': { userId: string };
    'user.verified': { userId: string };
}

export type WorkflowEventTypeKey = keyof WorkflowEventType;
