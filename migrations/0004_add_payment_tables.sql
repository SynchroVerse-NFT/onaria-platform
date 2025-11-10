-- Migration: Add payment and subscription system tables
-- Creates tables for payment methods, usage tracking, and billing history

-- ========================================
-- PAYMENT METHODS
-- ========================================

CREATE TABLE `payment_methods` (
    `id` TEXT PRIMARY KEY,
    `user_id` TEXT NOT NULL,
    `type` TEXT NOT NULL, -- 'wallet' or 'stripe'
    `chain` TEXT, -- For wallet type: 'ethereum', 'solana', 'polygon', 'base'
    `wallet_address` TEXT, -- For wallet type
    `stripe_payment_method_id` TEXT, -- For stripe type
    `last4` TEXT, -- Last 4 digits for cards
    `is_default` INTEGER DEFAULT 0, -- Boolean as 0/1
    `is_active` INTEGER DEFAULT 1, -- Boolean as 0/1
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);--> statement-breakpoint

CREATE INDEX `payment_methods_user_idx` ON `payment_methods` (`user_id`);--> statement-breakpoint
CREATE INDEX `payment_methods_type_idx` ON `payment_methods` (`type`);--> statement-breakpoint
CREATE INDEX `payment_methods_chain_idx` ON `payment_methods` (`chain`);--> statement-breakpoint
CREATE INDEX `payment_methods_is_default_idx` ON `payment_methods` (`is_default`);--> statement-breakpoint
CREATE INDEX `payment_methods_is_active_idx` ON `payment_methods` (`is_active`);--> statement-breakpoint

-- ========================================
-- SUBSCRIPTIONS (EXTENDED)
-- ========================================

-- Add new columns to existing subscriptions table
ALTER TABLE `subscriptions` ADD COLUMN `tier` TEXT; -- 'free', 'pro', 'business', 'enterprise', 'byok'--> statement-breakpoint
ALTER TABLE `subscriptions` ADD COLUMN `start_date` INTEGER;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD COLUMN `end_date` INTEGER;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD COLUMN `payment_method_id` TEXT;--> statement-breakpoint

-- Update existing subscriptions to have tier values based on plan_type
UPDATE `subscriptions` SET `tier` = `plan_type` WHERE `tier` IS NULL;--> statement-breakpoint
UPDATE `subscriptions` SET `start_date` = `current_period_start` WHERE `start_date` IS NULL;--> statement-breakpoint
UPDATE `subscriptions` SET `end_date` = `current_period_end` WHERE `end_date` IS NULL;--> statement-breakpoint

CREATE INDEX `subscriptions_tier_idx` ON `subscriptions` (`tier`);--> statement-breakpoint
CREATE INDEX `subscriptions_start_date_idx` ON `subscriptions` (`start_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_end_date_idx` ON `subscriptions` (`end_date`);--> statement-breakpoint
CREATE INDEX `subscriptions_payment_method_idx` ON `subscriptions` (`payment_method_id`);--> statement-breakpoint

-- ========================================
-- USAGE METRICS
-- ========================================

CREATE TABLE `usage_metrics` (
    `id` TEXT PRIMARY KEY,
    `user_id` TEXT NOT NULL,
    `subscription_id` TEXT,
    `date` TEXT NOT NULL, -- YYYY-MM-DD format
    `ai_generations` INTEGER DEFAULT 0,
    `tokens_used` INTEGER DEFAULT 0,
    `apps_created` INTEGER DEFAULT 0,
    `workflow_executions` INTEGER DEFAULT 0,
    `estimated_cost` REAL DEFAULT 0.0, -- USD
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL,
    UNIQUE(`user_id`, `date`)
);--> statement-breakpoint

CREATE INDEX `usage_metrics_user_idx` ON `usage_metrics` (`user_id`);--> statement-breakpoint
CREATE INDEX `usage_metrics_subscription_idx` ON `usage_metrics` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `usage_metrics_date_idx` ON `usage_metrics` (`date`);--> statement-breakpoint
CREATE INDEX `usage_metrics_user_date_idx` ON `usage_metrics` (`user_id`, `date`);--> statement-breakpoint

-- ========================================
-- BILLING HISTORY
-- ========================================

CREATE TABLE `billing_history` (
    `id` TEXT PRIMARY KEY,
    `user_id` TEXT NOT NULL,
    `subscription_id` TEXT,
    `type` TEXT NOT NULL, -- 'subscription', 'upgrade', 'overage', 'refund'
    `amount` REAL NOT NULL,
    `currency` TEXT DEFAULT 'USD',
    `description` TEXT NOT NULL,
    `payment_method_id` TEXT,
    `status` TEXT NOT NULL, -- 'paid', 'pending', 'failed', 'refunded'
    `invoice_url` TEXT,
    `created_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL
);--> statement-breakpoint

CREATE INDEX `billing_history_user_idx` ON `billing_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `billing_history_subscription_idx` ON `billing_history` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `billing_history_payment_method_idx` ON `billing_history` (`payment_method_id`);--> statement-breakpoint
CREATE INDEX `billing_history_type_idx` ON `billing_history` (`type`);--> statement-breakpoint
CREATE INDEX `billing_history_status_idx` ON `billing_history` (`status`);--> statement-breakpoint
CREATE INDEX `billing_history_created_at_idx` ON `billing_history` (`created_at`);--> statement-breakpoint

-- ========================================
-- UPDATE CRYPTO PAYMENTS
-- ========================================

-- Update crypto_payments to support new fields
ALTER TABLE `crypto_payments` ADD COLUMN `wallet_address` TEXT;--> statement-breakpoint

-- Populate wallet_address from from_address for existing records
UPDATE `crypto_payments` SET `wallet_address` = `from_address` WHERE `wallet_address` IS NULL;--> statement-breakpoint

CREATE INDEX `crypto_payments_wallet_address_idx` ON `crypto_payments` (`wallet_address`);--> statement-breakpoint
