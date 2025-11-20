ALTER TABLE `users` ADD `subscription_tier` text DEFAULT 'free';--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_status` text DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `subscription_expires_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_customer_id` text;--> statement-breakpoint
ALTER TABLE `users` ADD `stripe_subscription_id` text;