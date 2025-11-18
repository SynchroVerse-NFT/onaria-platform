CREATE TABLE `llm_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`app_id` text,
	`agent_action_name` text NOT NULL,
	`model_name` text NOT NULL,
	`provider` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`completion_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`cost` real NOT NULL,
	`metadata` text,
	`requested_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `llm_usage_user_id_idx` ON `llm_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `llm_usage_app_id_idx` ON `llm_usage` (`app_id`);--> statement-breakpoint
CREATE INDEX `llm_usage_agent_action_idx` ON `llm_usage` (`agent_action_name`);--> statement-breakpoint
CREATE INDEX `llm_usage_provider_idx` ON `llm_usage` (`provider`);--> statement-breakpoint
CREATE INDEX `llm_usage_requested_at_idx` ON `llm_usage` (`requested_at`);--> statement-breakpoint
CREATE INDEX `llm_usage_user_requested_at_idx` ON `llm_usage` (`user_id`,`requested_at`);--> statement-breakpoint
CREATE INDEX `llm_usage_app_requested_at_idx` ON `llm_usage` (`app_id`,`requested_at`);
