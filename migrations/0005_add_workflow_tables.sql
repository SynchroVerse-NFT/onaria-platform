-- Migration: Add workflow and webhook tables for n8n integration
-- This adds support for webhooks, workflow templates, workflow instances, and workflow executions

-- Webhooks table - User-configured webhooks for receiving events
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`secret` text NOT NULL,
	`events` text NOT NULL,
	`is_active` integer DEFAULT 1,
	`last_triggered_at` integer,
	`trigger_count` integer DEFAULT 0,
	`failure_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhooks_user_id_idx` ON `webhooks` (`user_id`);--> statement-breakpoint
CREATE INDEX `webhooks_is_active_idx` ON `webhooks` (`is_active`);--> statement-breakpoint

-- Webhook Logs table - Detailed webhook delivery logs
CREATE TABLE `webhook_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`webhook_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload` text NOT NULL,
	`response_status` integer,
	`response_body` text,
	`response_time` integer,
	`success` integer,
	`error` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_logs_webhook_id_idx` ON `webhook_logs` (`webhook_id`);--> statement-breakpoint
CREATE INDEX `webhook_logs_event_type_idx` ON `webhook_logs` (`event_type`);--> statement-breakpoint
CREATE INDEX `webhook_logs_created_at_idx` ON `webhook_logs` (`created_at`);--> statement-breakpoint

-- Workflow Templates table - n8n workflow templates
CREATE TABLE `workflow_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`n8n_workflow_json` text NOT NULL,
	`event_type` text NOT NULL,
	`required_services` text,
	`icon` text,
	`is_official` integer DEFAULT 0,
	`usage_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workflow_templates_category_idx` ON `workflow_templates` (`category`);--> statement-breakpoint
CREATE INDEX `workflow_templates_event_type_idx` ON `workflow_templates` (`event_type`);--> statement-breakpoint
CREATE INDEX `workflow_templates_is_official_idx` ON `workflow_templates` (`is_official`);--> statement-breakpoint

-- Workflow Instances table - User-deployed workflow instances
CREATE TABLE `workflow_instances` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text,
	`name` text NOT NULL,
	`n8n_workflow_id` text,
	`webhook_id` text NOT NULL,
	`is_active` integer DEFAULT 1,
	`configuration` text,
	`last_execution_at` integer,
	`execution_count` integer DEFAULT 0,
	`success_count` integer DEFAULT 0,
	`failure_count` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `workflow_templates`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`webhook_id`) REFERENCES `webhooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflow_instances_user_id_idx` ON `workflow_instances` (`user_id`);--> statement-breakpoint
CREATE INDEX `workflow_instances_template_id_idx` ON `workflow_instances` (`template_id`);--> statement-breakpoint
CREATE INDEX `workflow_instances_webhook_id_idx` ON `workflow_instances` (`webhook_id`);--> statement-breakpoint
CREATE INDEX `workflow_instances_is_active_idx` ON `workflow_instances` (`is_active`);--> statement-breakpoint

-- Workflow Executions table - Track workflow execution history
CREATE TABLE `workflow_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`workflow_instance_id` text NOT NULL,
	`user_id` text NOT NULL,
	`event_type` text NOT NULL,
	`trigger_data` text NOT NULL,
	`status` text NOT NULL,
	`n8n_execution_id` text,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`duration` integer,
	`error_message` text,
	`logs` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workflow_instance_id`) REFERENCES `workflow_instances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workflow_executions_workflow_instance_id_idx` ON `workflow_executions` (`workflow_instance_id`);--> statement-breakpoint
CREATE INDEX `workflow_executions_user_id_idx` ON `workflow_executions` (`user_id`);--> statement-breakpoint
CREATE INDEX `workflow_executions_event_type_idx` ON `workflow_executions` (`event_type`);--> statement-breakpoint
CREATE INDEX `workflow_executions_status_idx` ON `workflow_executions` (`status`);--> statement-breakpoint
CREATE INDEX `workflow_executions_created_at_idx` ON `workflow_executions` (`created_at`);
