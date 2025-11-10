/**
 * Type definitions for Workflow Executions Controller responses
 */

import type { WorkflowExecution } from '../../../../../src/api-types';

/**
 * Response data for listing workflow executions
 */
export interface WorkflowExecutionsListData {
    executions: WorkflowExecution[];
    total: number;
}

/**
 * Response data for getting a single workflow execution
 */
export interface WorkflowExecutionData {
    execution: WorkflowExecution;
}

/**
 * Response data for retrying a workflow execution
 */
export interface WorkflowExecutionRetryData {
    execution: WorkflowExecution;
    message: string;
}

/**
 * Workflow execution statistics
 */
export interface WorkflowStatsData {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    byStatus: {
        success: number;
        failed: number;
        running: number;
        cancelled: number;
    };
}
