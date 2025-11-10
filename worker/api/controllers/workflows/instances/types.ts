/**
 * Type definitions for Workflow Instances Controller responses
 */

import type { WorkflowInstance, Webhook } from '../../../../../src/api-types';

/**
 * Response data for creating a workflow instance
 */
export interface WorkflowInstanceCreateData {
    instance: WorkflowInstance;
    webhook: Webhook;
    message: string;
}

/**
 * Response data for listing workflow instances
 */
export interface WorkflowInstancesListData {
    instances: WorkflowInstance[];
}

/**
 * Response data for getting a single workflow instance
 */
export interface WorkflowInstanceData {
    instance: WorkflowInstance;
    webhook: Webhook;
}

/**
 * Response data for updating a workflow instance
 */
export interface WorkflowInstanceUpdateData {
    instance: WorkflowInstance;
    message: string;
}

/**
 * Response data for activating/deactivating a workflow
 */
export interface WorkflowInstanceStatusData {
    instance: WorkflowInstance;
    message: string;
}

/**
 * Response data for deleting a workflow instance
 */
export interface WorkflowInstanceDeleteData {
    success: boolean;
    message: string;
}
