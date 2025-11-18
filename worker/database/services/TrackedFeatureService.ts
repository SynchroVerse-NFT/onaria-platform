/**
 * Tracked Feature Service
 * Handles database operations for feature tracking system
 */

import { BaseService } from './BaseService';
import { eq, and, desc } from 'drizzle-orm';
import { trackedFeatures } from '../schema';
import type { TrackedFeature } from '../../agents/core/state';

export class TrackedFeatureService extends BaseService {
    /**
     * Create a new tracked feature in the database
     */
    async createTrackedFeature(feature: TrackedFeature & { appId: string }): Promise<void> {
        try {
            await this.database.insert(trackedFeatures).values({
                id: feature.id,
                appId: feature.appId,
                description: feature.description,
                status: feature.status,
                requestedAt: new Date(feature.requestedAt * 1000), // Convert unix timestamp to Date
                requestedInPhase: feature.requestedInPhase,
                implementedInPhase: feature.implementedInPhase,
                requiresConfirmation: feature.requiresConfirmation,
                userConfirmed: feature.userConfirmed ?? false,
                notes: feature.notes,
            });

            this.logger.info('Created tracked feature', {
                featureId: feature.id,
                appId: feature.appId,
                description: feature.description.substring(0, 100)
            });
        } catch (error) {
            this.handleDatabaseError(error, 'createTrackedFeature', { featureId: feature.id });
        }
    }

    /**
     * Create multiple tracked features in a single transaction
     */
    async createTrackedFeatures(appId: string, features: TrackedFeature[]): Promise<void> {
        if (features.length === 0) return;

        try {
            const values = features.map(feature => ({
                id: feature.id,
                appId,
                description: feature.description,
                status: feature.status,
                requestedAt: new Date(feature.requestedAt * 1000),
                requestedInPhase: feature.requestedInPhase,
                implementedInPhase: feature.implementedInPhase,
                requiresConfirmation: feature.requiresConfirmation,
                userConfirmed: feature.userConfirmed ?? false,
                notes: feature.notes,
            }));

            await this.database.insert(trackedFeatures).values(values);

            this.logger.info('Created tracked features', {
                appId,
                count: features.length
            });
        } catch (error) {
            this.handleDatabaseError(error, 'createTrackedFeatures', { appId, count: features.length });
        }
    }

    /**
     * Update an existing tracked feature
     */
    async updateTrackedFeature(
        featureId: string,
        updates: Partial<Pick<TrackedFeature, 'status' | 'implementedInPhase' | 'userConfirmed' | 'notes'>>
    ): Promise<void> {
        try {
            const updateData: Record<string, unknown> = {
                updatedAt: new Date(),
            };

            if (updates.status !== undefined) updateData.status = updates.status;
            if (updates.implementedInPhase !== undefined) updateData.implementedInPhase = updates.implementedInPhase;
            if (updates.userConfirmed !== undefined) updateData.userConfirmed = updates.userConfirmed;
            if (updates.notes !== undefined) updateData.notes = updates.notes;

            await this.database
                .update(trackedFeatures)
                .set(updateData)
                .where(eq(trackedFeatures.id, featureId));

            this.logger.info('Updated tracked feature', {
                featureId,
                updates: Object.keys(updates)
            });
        } catch (error) {
            this.handleDatabaseError(error, 'updateTrackedFeature', { featureId });
        }
    }

    /**
     * Get all tracked features for an app
     */
    async getTrackedFeatures(appId: string): Promise<TrackedFeature[]> {
        try {
            const features = await this.getReadDb().select().from(trackedFeatures)
                .where(eq(trackedFeatures.appId, appId))
                .orderBy(desc(trackedFeatures.requestedAt));

            return features.map(f => ({
                id: f.id,
                description: f.description,
                status: f.status as TrackedFeature['status'],
                requestedAt: Math.floor(f.requestedAt.getTime() / 1000), // Convert Date to unix timestamp
                requestedInPhase: f.requestedInPhase,
                implementedInPhase: f.implementedInPhase ?? undefined,
                requiresConfirmation: Boolean(f.requiresConfirmation),
                userConfirmed: Boolean(f.userConfirmed),
                notes: f.notes ?? undefined,
            }));
        } catch (error) {
            this.handleDatabaseError(error, 'getTrackedFeatures', { appId });
        }
    }

    /**
     * Delete a tracked feature
     */
    async deleteTrackedFeature(featureId: string): Promise<void> {
        try {
            await this.database
                .delete(trackedFeatures)
                .where(eq(trackedFeatures.id, featureId));

            this.logger.info('Deleted tracked feature', { featureId });
        } catch (error) {
            this.handleDatabaseError(error, 'deleteTrackedFeature', { featureId });
        }
    }

    /**
     * Delete all tracked features for an app
     */
    async deleteAllTrackedFeatures(appId: string): Promise<void> {
        try {
            await this.database
                .delete(trackedFeatures)
                .where(eq(trackedFeatures.appId, appId));

            this.logger.info('Deleted all tracked features for app', { appId });
        } catch (error) {
            this.handleDatabaseError(error, 'deleteAllTrackedFeatures', { appId });
        }
    }

    /**
     * Get tracked features by status
     */
    async getTrackedFeaturesByStatus(appId: string, status: TrackedFeature['status']): Promise<TrackedFeature[]> {
        try {
            const features = await this.getReadDb().select().from(trackedFeatures)
                .where(and(
                    eq(trackedFeatures.appId, appId),
                    eq(trackedFeatures.status, status)
                ))
                .orderBy(desc(trackedFeatures.requestedAt));

            return features.map(f => ({
                id: f.id,
                description: f.description,
                status: f.status as TrackedFeature['status'],
                requestedAt: Math.floor(f.requestedAt.getTime() / 1000),
                requestedInPhase: f.requestedInPhase,
                implementedInPhase: f.implementedInPhase ?? undefined,
                requiresConfirmation: Boolean(f.requiresConfirmation),
                userConfirmed: Boolean(f.userConfirmed),
                notes: f.notes ?? undefined,
            }));
        } catch (error) {
            this.handleDatabaseError(error, 'getTrackedFeaturesByStatus', { appId, status });
        }
    }
}
