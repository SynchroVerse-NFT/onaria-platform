/**
 * Event Emission Helpers - Pre-built helpers for common platform events
 *
 * These helpers provide a consistent interface for emitting events
 * at key lifecycle points in the platform.
 */

import { Database } from '../../database/database';
import { emitEvent, triggerWorkflows } from './EventEmitterSingleton';
import { createLogger } from '../../logger';

const logger = createLogger('EventEmissionHelpers');

/**
 * Emit app.created event
 * Triggered when a new app is created
 */
export async function emitAppCreated(
    env: Env,
    db: Database,
    appId: string,
    userId: string,
    appData: {
        appName: string;
        templateName?: string;
        framework?: string;
        originalPrompt?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'app.created', {
            appId,
            appName: appData.appName,
            userId,
            templateName: appData.templateName || 'unknown',
            framework: appData.framework || 'unknown',
            originalPrompt: appData.originalPrompt,
            timestamp: Date.now()
        });

        // Also trigger workflow instances
        await triggerWorkflows(env, db, userId, 'app.created', {
            appId,
            appName: appData.appName,
            templateName: appData.templateName,
            framework: appData.framework
        });

        logger.info('app.created event emitted', { appId, userId });
    } catch (error) {
        logger.error('Failed to emit app.created event', { appId, userId, error });
        // Don't throw - event emission should not fail the main operation
    }
}

/**
 * Emit generation.complete event
 * Triggered when code generation completes
 */
export async function emitGenerationComplete(
    env: Env,
    db: Database,
    appId: string,
    userId: string,
    stats: {
        filesGenerated: number;
        duration: number;
        appName?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'generation.complete', {
            appId,
            appName: stats.appName || 'Unknown App',
            userId,
            filesGenerated: stats.filesGenerated,
            duration: stats.duration,
            timestamp: Date.now()
        });

        // Also trigger workflow instances
        await triggerWorkflows(env, db, userId, 'generation.complete', {
            appId,
            filesGenerated: stats.filesGenerated,
            duration: stats.duration
        });

        logger.info('generation.complete event emitted', { appId, userId });
    } catch (error) {
        logger.error('Failed to emit generation.complete event', { appId, userId, error });
    }
}

/**
 * Emit deployment.complete event
 * Triggered when app is successfully deployed
 */
export async function emitDeploymentComplete(
    env: Env,
    db: Database,
    appId: string,
    userId: string,
    deployment: {
        deploymentUrl: string;
        environment: 'preview' | 'production';
        appName?: string;
        instanceId?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'deployment.complete', {
            appId,
            appName: deployment.appName || 'Unknown App',
            userId,
            deploymentUrl: deployment.deploymentUrl,
            environment: deployment.environment,
            instanceId: deployment.instanceId,
            timestamp: Date.now()
        });

        // Also emit app.deployed for backward compatibility
        await emitEvent(env, db, userId, 'app.deployed', {
            appId,
            appName: deployment.appName || 'Unknown App',
            userId,
            deploymentUrl: deployment.deploymentUrl,
            environment: deployment.environment,
            timestamp: Date.now()
        });

        // Trigger workflow instances
        await triggerWorkflows(env, db, userId, 'deployment.complete', {
            appId,
            deploymentUrl: deployment.deploymentUrl,
            environment: deployment.environment
        });

        logger.info('deployment.complete event emitted', { appId, userId });
    } catch (error) {
        logger.error('Failed to emit deployment.complete event', { appId, userId, error });
    }
}

/**
 * Emit app.exported event
 * Triggered when app is exported to GitHub
 */
export async function emitGitHubExport(
    env: Env,
    db: Database,
    appId: string,
    userId: string,
    repo: {
        repositoryUrl: string;
        isPrivate: boolean;
        appName?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'app.exported', {
            appId,
            appName: repo.appName || 'Unknown App',
            userId,
            repositoryUrl: repo.repositoryUrl,
            isPrivate: repo.isPrivate,
            timestamp: Date.now()
        });

        // Trigger workflow instances
        await triggerWorkflows(env, db, userId, 'app.exported', {
            appId,
            repositoryUrl: repo.repositoryUrl,
            isPrivate: repo.isPrivate
        });

        logger.info('app.exported event emitted', { appId, userId });
    } catch (error) {
        logger.error('Failed to emit app.exported event', { appId, userId, error });
    }
}

/**
 * Emit app.error event
 * Triggered when a runtime error is detected
 */
export async function emitAppError(
    env: Env,
    db: Database,
    appId: string,
    userId: string,
    errorInfo: {
        errorType: string;
        errorMessage: string;
        stackTrace?: string;
        appName?: string;
        source?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'app.error', {
            appId,
            appName: errorInfo.appName || 'Unknown App',
            userId,
            errorType: errorInfo.errorType,
            errorMessage: errorInfo.errorMessage,
            stackTrace: errorInfo.stackTrace,
            source: errorInfo.source || 'runtime',
            timestamp: Date.now()
        });

        // Trigger workflow instances
        await triggerWorkflows(env, db, userId, 'app.error', {
            appId,
            errorType: errorInfo.errorType,
            errorMessage: errorInfo.errorMessage
        });

        logger.info('app.error event emitted', { appId, userId });
    } catch (error) {
        logger.error('Failed to emit app.error event', { appId, userId, error });
    }
}

/**
 * Emit user.registered event
 * Triggered when a new user registers
 */
export async function emitUserRegistered(
    env: Env,
    db: Database,
    userId: string,
    userData: {
        email: string;
        provider: string;
        displayName?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'user.registered', {
            userId,
            email: userData.email,
            provider: userData.provider,
            displayName: userData.displayName,
            timestamp: Date.now()
        });

        // Trigger workflow instances
        await triggerWorkflows(env, db, userId, 'user.registered', {
            userId,
            email: userData.email,
            provider: userData.provider
        });

        logger.info('user.registered event emitted', { userId });
    } catch (error) {
        logger.error('Failed to emit user.registered event', { userId, error });
    }
}

/**
 * Emit user.verified event
 * Triggered when a user verifies their email
 */
export async function emitUserVerified(
    env: Env,
    db: Database,
    userId: string,
    userData: {
        email: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'user.verified', {
            userId,
            email: userData.email,
            timestamp: Date.now()
        });

        // Trigger workflow instances
        await triggerWorkflows(env, db, userId, 'user.verified', {
            userId,
            email: userData.email
        });

        logger.info('user.verified event emitted', { userId });
    } catch (error) {
        logger.error('Failed to emit user.verified event', { userId, error });
    }
}

/**
 * Emit payment.success event
 * Triggered when a payment succeeds
 */
export async function emitPaymentSuccess(
    env: Env,
    db: Database,
    userId: string,
    paymentData: {
        amount: number;
        currency: string;
        planId?: string;
        transactionId?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'payment.success', {
            userId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            planId: paymentData.planId,
            transactionId: paymentData.transactionId,
            timestamp: Date.now()
        });

        // Trigger workflow instances
        await triggerWorkflows(env, db, userId, 'payment.success', {
            userId,
            amount: paymentData.amount,
            currency: paymentData.currency
        });

        logger.info('payment.success event emitted', { userId });
    } catch (error) {
        logger.error('Failed to emit payment.success event', { userId, error });
    }
}

/**
 * Emit payment.failed event
 * Triggered when a payment fails
 */
export async function emitPaymentFailed(
    env: Env,
    db: Database,
    userId: string,
    paymentData: {
        amount: number;
        currency: string;
        reason?: string;
        transactionId?: string;
    }
): Promise<void> {
    try {
        await emitEvent(env, db, userId, 'payment.failed', {
            userId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            reason: paymentData.reason,
            transactionId: paymentData.transactionId,
            timestamp: Date.now()
        });

        // Trigger workflow instances
        await triggerWorkflows(env, db, userId, 'payment.failed', {
            userId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            reason: paymentData.reason
        });

        logger.info('payment.failed event emitted', { userId });
    } catch (error) {
        logger.error('Failed to emit payment.failed event', { userId, error });
    }
}
