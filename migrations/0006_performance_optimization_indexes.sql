-- Migration: Performance Optimization Indexes
-- Purpose: Add composite indexes for common query patterns to improve query performance
-- Date: 2025-11-21

-- App listing queries often filter by userId + status + visibility
CREATE INDEX IF NOT EXISTS apps_user_status_visibility_idx ON apps(user_id, status, visibility);--> statement-breakpoint

-- App listing queries often filter by userId + visibility + updated_at for sorting
CREATE INDEX IF NOT EXISTS apps_user_visibility_updated_idx ON apps(user_id, visibility, updated_at DESC);--> statement-breakpoint

-- Public app discovery queries filter by visibility + status + created_at
CREATE INDEX IF NOT EXISTS apps_visibility_status_created_idx ON apps(visibility, status, created_at DESC);--> statement-breakpoint

-- Public app discovery queries filter by visibility + status + updated_at
CREATE INDEX IF NOT EXISTS apps_visibility_status_updated_idx ON apps(visibility, status, updated_at DESC);--> statement-breakpoint

-- App views aggregation queries filter by appId + viewedAt for time-based analytics
CREATE INDEX IF NOT EXISTS app_views_app_viewed_range_idx ON app_views(app_id, viewed_at DESC);--> statement-breakpoint

-- Stars aggregation queries filter by appId + starredAt for trending calculations
CREATE INDEX IF NOT EXISTS stars_app_starred_range_idx ON stars(app_id, starred_at DESC);--> statement-breakpoint

-- LLM usage queries often filter by userId + requestedAt for cost analytics
CREATE INDEX IF NOT EXISTS llm_usage_user_requested_range_idx ON llm_usage(user_id, requested_at DESC);--> statement-breakpoint

-- LLM usage queries often filter by appId + requestedAt for app-specific analytics
CREATE INDEX IF NOT EXISTS llm_usage_app_requested_range_idx ON llm_usage(app_id, requested_at DESC);--> statement-breakpoint

-- Session cleanup queries filter by expiresAt + isRevoked
CREATE INDEX IF NOT EXISTS sessions_expires_revoked_idx ON sessions(expires_at, is_revoked);--> statement-breakpoint

-- Favorites queries often need userId + createdAt for recent favorites
CREATE INDEX IF NOT EXISTS favorites_user_created_idx ON favorites(user_id, created_at DESC);--> statement-breakpoint

-- Stars queries often need userId + starredAt for user's starred apps
CREATE INDEX IF NOT EXISTS stars_user_starred_idx ON stars(user_id, starred_at DESC);--> statement-breakpoint

-- Tracked features queries filter by appId + status for feature completion tracking
CREATE INDEX IF NOT EXISTS tracked_features_app_status_requested_idx ON tracked_features(app_id, status, requested_at DESC);
