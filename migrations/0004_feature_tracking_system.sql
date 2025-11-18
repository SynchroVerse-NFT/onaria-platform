CREATE TABLE `tracked_features` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`requested_in_phase` integer NOT NULL,
	`implemented_in_phase` integer,
	`requires_confirmation` integer DEFAULT 1 NOT NULL,
	`user_confirmed` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `tracked_features_app_id_idx` ON `tracked_features` (`app_id`);--> statement-breakpoint
CREATE INDEX `tracked_features_status_idx` ON `tracked_features` (`status`);--> statement-breakpoint
CREATE INDEX `tracked_features_requested_at_idx` ON `tracked_features` (`requested_at`);--> statement-breakpoint
CREATE INDEX `tracked_features_app_status_idx` ON `tracked_features` (`app_id`,`status`);
