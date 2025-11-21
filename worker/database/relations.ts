/**
 * Drizzle ORM Relations Configuration
 * Defines relationships between tables for easier eager loading and joins
 */

import { relations } from 'drizzle-orm';
import * as schema from './schema';

// User Relations
export const usersRelations = relations(schema.users, ({ many }) => ({
    apps: many(schema.apps),
    sessions: many(schema.sessions),
    apiKeys: many(schema.apiKeys),
    favorites: many(schema.favorites),
    stars: many(schema.stars),
    appLikes: many(schema.appLikes),
    appComments: many(schema.appComments),
    commentLikes: many(schema.commentLikes),
    appViews: many(schema.appViews),
    userSecrets: many(schema.userSecrets),
    userModelConfigs: many(schema.userModelConfigs),
    userModelProviders: many(schema.userModelProviders),
    llmUsage: many(schema.llmUsage),
}));

// App Relations
export const appsRelations = relations(schema.apps, ({ one, many }) => ({
    user: one(schema.users, {
        fields: [schema.apps.userId],
        references: [schema.users.id],
    }),
    parentApp: one(schema.apps, {
        fields: [schema.apps.parentAppId],
        references: [schema.apps.id],
        relationName: 'parentApp',
    }),
    forks: many(schema.apps, {
        relationName: 'parentApp',
    }),
    favorites: many(schema.favorites),
    stars: many(schema.stars),
    likes: many(schema.appLikes),
    comments: many(schema.appComments),
    views: many(schema.appViews),
    trackedFeatures: many(schema.trackedFeatures),
    llmUsage: many(schema.llmUsage),
}));

// Session Relations
export const sessionsRelations = relations(schema.sessions, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.sessions.userId],
        references: [schema.users.id],
    }),
}));

// API Key Relations
export const apiKeysRelations = relations(schema.apiKeys, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.apiKeys.userId],
        references: [schema.users.id],
    }),
}));

// Favorite Relations
export const favoritesRelations = relations(schema.favorites, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.favorites.userId],
        references: [schema.users.id],
    }),
    app: one(schema.apps, {
        fields: [schema.favorites.appId],
        references: [schema.apps.id],
    }),
}));

// Star Relations
export const starsRelations = relations(schema.stars, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.stars.userId],
        references: [schema.users.id],
    }),
    app: one(schema.apps, {
        fields: [schema.stars.appId],
        references: [schema.apps.id],
    }),
}));

// App Like Relations
export const appLikesRelations = relations(schema.appLikes, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.appLikes.userId],
        references: [schema.users.id],
    }),
    app: one(schema.apps, {
        fields: [schema.appLikes.appId],
        references: [schema.apps.id],
    }),
}));

// App Comment Relations
export const appCommentsRelations = relations(schema.appComments, ({ one, many }) => ({
    user: one(schema.users, {
        fields: [schema.appComments.userId],
        references: [schema.users.id],
    }),
    app: one(schema.apps, {
        fields: [schema.appComments.appId],
        references: [schema.apps.id],
    }),
    parentComment: one(schema.appComments, {
        fields: [schema.appComments.parentCommentId],
        references: [schema.appComments.id],
        relationName: 'parentComment',
    }),
    replies: many(schema.appComments, {
        relationName: 'parentComment',
    }),
    likes: many(schema.commentLikes),
}));

// Comment Like Relations
export const commentLikesRelations = relations(schema.commentLikes, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.commentLikes.userId],
        references: [schema.users.id],
    }),
    comment: one(schema.appComments, {
        fields: [schema.commentLikes.commentId],
        references: [schema.appComments.id],
    }),
}));

// App View Relations
export const appViewsRelations = relations(schema.appViews, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.appViews.userId],
        references: [schema.users.id],
    }),
    app: one(schema.apps, {
        fields: [schema.appViews.appId],
        references: [schema.apps.id],
    }),
}));

// OAuth State Relations
export const oauthStatesRelations = relations(schema.oauthStates, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.oauthStates.userId],
        references: [schema.users.id],
    }),
}));

// User Secret Relations
export const userSecretsRelations = relations(schema.userSecrets, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.userSecrets.userId],
        references: [schema.users.id],
    }),
}));

// User Model Config Relations
export const userModelConfigsRelations = relations(schema.userModelConfigs, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.userModelConfigs.userId],
        references: [schema.users.id],
    }),
}));

// User Model Provider Relations
export const userModelProvidersRelations = relations(schema.userModelProviders, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.userModelProviders.userId],
        references: [schema.users.id],
    }),
    secret: one(schema.userSecrets, {
        fields: [schema.userModelProviders.secretId],
        references: [schema.userSecrets.id],
    }),
}));

// Tracked Feature Relations
export const trackedFeaturesRelations = relations(schema.trackedFeatures, ({ one }) => ({
    app: one(schema.apps, {
        fields: [schema.trackedFeatures.appId],
        references: [schema.apps.id],
    }),
}));

// LLM Usage Relations
export const llmUsageRelations = relations(schema.llmUsage, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.llmUsage.userId],
        references: [schema.users.id],
    }),
    app: one(schema.apps, {
        fields: [schema.llmUsage.appId],
        references: [schema.apps.id],
    }),
}));

// Password Reset Token Relations
export const passwordResetTokensRelations = relations(schema.passwordResetTokens, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.passwordResetTokens.userId],
        references: [schema.users.id],
    }),
}));

// Email Verification Token Relations
export const emailVerificationTokensRelations = relations(schema.emailVerificationTokens, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.emailVerificationTokens.userId],
        references: [schema.users.id],
    }),
}));

// Audit Log Relations
export const auditLogsRelations = relations(schema.auditLogs, ({ one }) => ({
    user: one(schema.users, {
        fields: [schema.auditLogs.userId],
        references: [schema.users.id],
    }),
}));

// System Settings Relations
export const systemSettingsRelations = relations(schema.systemSettings, ({ one }) => ({
    updatedByUser: one(schema.users, {
        fields: [schema.systemSettings.updatedBy],
        references: [schema.users.id],
    }),
}));
