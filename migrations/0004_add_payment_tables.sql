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
-- SUBSCRIPTIONS
-- ========================================

CREATE TABLE `subscriptions` (
    `id` TEXT PRIMARY KEY,
    `user_id` TEXT NOT NULL,
    `tier` TEXT NOT NULL, -- 'free', 'pro', 'business', 'enterprise', 'byok'
    `status` TEXT NOT NULL, -- 'active', 'cancelled', 'expired', 'past_due'
    `start_date` INTEGER NOT NULL,
    `end_date` INTEGER,
    `payment_method_id` TEXT,
    `is_trial` INTEGER DEFAULT 0, -- Boolean as 0/1
    `trial_ends_at` INTEGER,
    `scheduled_tier` TEXT, -- For scheduled downgrades
    `scheduled_tier_date` INTEGER,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL
);--> statement-breakpoint

CREATE INDEX `subscriptions_user_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_tier_idx` ON `subscriptions` (`tier`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
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
-- CRYPTO PAYMENTS
-- ========================================

CREATE TABLE `crypto_payments` (
    `id` TEXT PRIMARY KEY,
    `user_id` TEXT NOT NULL,
    `subscription_id` TEXT,
    `payment_method_id` TEXT,
    `chain` TEXT NOT NULL, -- 'ethereum', 'solana', 'polygon', 'base'
    `transaction_hash` TEXT NOT NULL UNIQUE,
    `from_address` TEXT NOT NULL,
    `to_address` TEXT NOT NULL,
    `wallet_address` TEXT NOT NULL,
    `amount` TEXT NOT NULL, -- Stored as string to preserve precision
    `amount_usd` REAL, -- USD value at time of payment
    `status` TEXT NOT NULL, -- 'pending', 'confirmed', 'failed'
    `confirmations` INTEGER DEFAULT 0,
    `block_number` INTEGER,
    `verified_at` INTEGER,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods`(`id`) ON DELETE SET NULL
);--> statement-breakpoint

CREATE INDEX `crypto_payments_user_idx` ON `crypto_payments` (`user_id`);--> statement-breakpoint
CREATE INDEX `crypto_payments_subscription_idx` ON `crypto_payments` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `crypto_payments_chain_idx` ON `crypto_payments` (`chain`);--> statement-breakpoint
CREATE INDEX `crypto_payments_transaction_hash_idx` ON `crypto_payments` (`transaction_hash`);--> statement-breakpoint
CREATE INDEX `crypto_payments_wallet_address_idx` ON `crypto_payments` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `crypto_payments_status_idx` ON `crypto_payments` (`status`);--> statement-breakpoint
CREATE INDEX `crypto_payments_created_at_idx` ON `crypto_payments` (`created_at`);--> statement-breakpoint
