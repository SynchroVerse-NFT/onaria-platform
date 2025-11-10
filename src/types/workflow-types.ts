/**
 * Workflow Types - Frontend type definitions for workflow management
 * These types match the backend API structure from Agent 3
 */

// Workflow Status Types
export type WorkflowStatus = 'active' | 'inactive' | 'error';
export type ExecutionStatus = 'success' | 'failed' | 'running' | 'cancelled';
export type WebhookDeliveryStatus = 'success' | 'failed';

// Event Types
export type WorkflowEventType =
	| 'lead_capture'
	| 'payment_success'
	| 'error_alert'
	| 'new_app'
	| 'deployment'
	| 'custom';

// Service Types
export type ServiceType = 'gmail' | 'sheets' | 'slack' | 'discord' | 'github' | 'twitter';

export interface ServiceConnection {
	id: string;
	type: ServiceType;
	name: string;
	connected: boolean;
	accountInfo?: {
		email?: string;
		username?: string;
		webhookUrl?: string;
	};
	scopes?: string[];
	connectedAt?: Date;
}

// Template Types
export interface WorkflowTemplate {
	id: string;
	name: string;
	description: string;
	category: 'automation' | 'notification' | 'integration' | 'analytics';
	icon: string;
	eventTrigger: WorkflowEventType;
	requiredServices: ServiceType[];
	actions: WorkflowAction[];
	usageCount: number;
	tags: string[];
	configSchema: Record<string, unknown>;
}

export interface WorkflowAction {
	id: string;
	type: 'send_email' | 'create_sheet_row' | 'post_message' | 'create_issue' | 'post_tweet';
	service: ServiceType;
	config: Record<string, unknown>;
	order: number;
}

// Workflow Instance Types
export interface Workflow {
	id: string;
	userId: string;
	name: string;
	description?: string;
	templateId?: string;
	status: WorkflowStatus;
	eventTrigger: WorkflowEventType;
	actions: WorkflowAction[];
	config: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
	lastRunAt?: Date;
	executionCount: number;
	successCount: number;
	failureCount: number;
	averageDuration?: number;
}

// Execution Types
export interface WorkflowExecution {
	id: string;
	workflowId: string;
	workflowName: string;
	status: ExecutionStatus;
	eventType: WorkflowEventType;
	triggerData: Record<string, unknown>;
	steps: ExecutionStep[];
	startedAt: Date;
	completedAt?: Date;
	duration?: number;
	error?: string;
	n8nExecutionId?: string;
	logs?: ExecutionLog[];
}

export interface ExecutionStep {
	id: string;
	name: string;
	status: ExecutionStatus;
	startedAt: Date;
	completedAt?: Date;
	duration?: number;
	output?: Record<string, unknown>;
	error?: string;
}

export interface ExecutionLog {
	timestamp: Date;
	level: 'info' | 'warn' | 'error';
	message: string;
	metadata?: Record<string, unknown>;
}

// Webhook Types
export interface WebhookConfig {
	id: string;
	userId: string;
	url: string;
	secret: string;
	events: WorkflowEventType[];
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface WebhookDelivery {
	id: string;
	webhookId: string;
	eventType: WorkflowEventType;
	status: WebhookDeliveryStatus;
	payload: Record<string, unknown>;
	response?: {
		statusCode: number;
		body: string;
	};
	sentAt: Date;
	responseTime?: number;
	error?: string;
	retryCount: number;
}

// Statistics Types
export interface WorkflowStats {
	totalExecutions: number;
	successRate: number;
	averageDuration: number;
	activeWorkflows: number;
	executionsByDay: Array<{
		date: string;
		count: number;
		successCount: number;
		failureCount: number;
	}>;
	topWorkflows: Array<{
		workflowId: string;
		workflowName: string;
		executionCount: number;
	}>;
}

// API Request/Response Types
export interface CreateWorkflowRequest {
	templateId?: string;
	name: string;
	description?: string;
	eventTrigger: WorkflowEventType;
	actions: Omit<WorkflowAction, 'id'>[];
	config: Record<string, unknown>;
}

export interface UpdateWorkflowRequest {
	name?: string;
	description?: string;
	status?: WorkflowStatus;
	actions?: Omit<WorkflowAction, 'id'>[];
	config?: Record<string, unknown>;
}

export interface ConnectServiceRequest {
	type: ServiceType;
	authCode?: string;
	webhookUrl?: string;
	config?: Record<string, unknown>;
}

export interface RegenerateWebhookSecretRequest {
	webhookId: string;
}

export interface RetryExecutionRequest {
	executionId: string;
}

export interface TestWebhookRequest {
	webhookId: string;
	eventType: WorkflowEventType;
	testPayload?: Record<string, unknown>;
}

// Filter/Query Types
export interface WorkflowQueryOptions {
	status?: WorkflowStatus;
	search?: string;
	sortBy?: 'recent' | 'most_used' | 'success_rate' | 'name';
	sortOrder?: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

export interface ExecutionQueryOptions {
	workflowId?: string;
	status?: ExecutionStatus;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

export interface WebhookDeliveryQueryOptions {
	webhookId?: string;
	status?: WebhookDeliveryStatus;
	startDate?: Date;
	endDate?: Date;
	limit?: number;
	offset?: number;
}

// UI-specific Types
export interface WorkflowCardProps {
	workflow: Workflow;
	onClick: (workflowId: string) => void;
	onToggleStatus: (workflowId: string, status: WorkflowStatus) => void;
	onDelete: (workflowId: string) => void;
}

export interface TemplateCardProps {
	template: WorkflowTemplate;
	onUseTemplate: (templateId: string) => void;
	onPreview: (templateId: string) => void;
}

export interface ExecutionRowProps {
	execution: WorkflowExecution;
	onViewDetails: (executionId: string) => void;
	onRetry?: (executionId: string) => void;
}

// Configuration Form Types
export interface WorkflowConfigStep {
	step: number;
	title: string;
	description: string;
	completed: boolean;
}

export interface ServiceConnectionStatus {
	type: ServiceType;
	required: boolean;
	connected: boolean;
	connection?: ServiceConnection;
}

// Date Range Types for Filters
export type DateRange = '7d' | '30d' | '90d' | 'all';

export interface DateRangeOption {
	value: DateRange;
	label: string;
	days?: number;
}
