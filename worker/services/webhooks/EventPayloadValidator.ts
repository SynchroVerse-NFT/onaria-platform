/**
 * Event Payload Validator
 *
 * Validates event payloads before emission to ensure data integrity
 * and consistency across the platform.
 */

import { WorkflowEventType } from './EventEmitter';
import { createLogger } from '../../logger';

const logger = createLogger('EventPayloadValidator');

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export class EventPayloadValidator {
    /**
     * Validate an event payload
     */
    validate(eventType: WorkflowEventType, payload: Record<string, unknown>): ValidationResult {
        const errors: string[] = [];

        // Common validations for all events
        if (!payload.timestamp || typeof payload.timestamp !== 'number') {
            errors.push('timestamp is required and must be a number');
        }

        // Event-specific validations
        switch (eventType) {
            case 'app.created':
                this.validateAppCreated(payload, errors);
                break;
            case 'app.deployed':
                this.validateAppDeployed(payload, errors);
                break;
            case 'app.exported':
                this.validateAppExported(payload, errors);
                break;
            case 'app.error':
                this.validateAppError(payload, errors);
                break;
            case 'generation.complete':
                this.validateGenerationComplete(payload, errors);
                break;
            case 'deployment.complete':
                this.validateDeploymentComplete(payload, errors);
                break;
            case 'user.registered':
                this.validateUserRegistered(payload, errors);
                break;
            case 'user.verified':
                this.validateUserVerified(payload, errors);
                break;
            case 'payment.success':
                this.validatePaymentSuccess(payload, errors);
                break;
            case 'payment.failed':
                this.validatePaymentFailed(payload, errors);
                break;
            default:
                errors.push(`Unknown event type: ${eventType}`);
        }

        const valid = errors.length === 0;

        if (!valid) {
            logger.warn('Event payload validation failed', { eventType, errors });
        }

        return { valid, errors };
    }

    /**
     * Validate app.created payload
     */
    private validateAppCreated(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.appId || typeof payload.appId !== 'string') {
            errors.push('appId is required and must be a string');
        }

        if (!payload.appName || typeof payload.appName !== 'string') {
            errors.push('appName is required and must be a string');
        }

        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (payload.templateName && typeof payload.templateName !== 'string') {
            errors.push('templateName must be a string');
        }

        if (payload.framework && typeof payload.framework !== 'string') {
            errors.push('framework must be a string');
        }
    }

    /**
     * Validate app.deployed payload
     */
    private validateAppDeployed(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.appId || typeof payload.appId !== 'string') {
            errors.push('appId is required and must be a string');
        }

        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (!payload.deploymentUrl || typeof payload.deploymentUrl !== 'string') {
            errors.push('deploymentUrl is required and must be a string');
        }

        if (payload.environment && !['preview', 'production'].includes(payload.environment as string)) {
            errors.push('environment must be either "preview" or "production"');
        }
    }

    /**
     * Validate deployment.complete payload
     */
    private validateDeploymentComplete(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.appId || typeof payload.appId !== 'string') {
            errors.push('appId is required and must be a string');
        }

        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (!payload.deploymentUrl || typeof payload.deploymentUrl !== 'string') {
            errors.push('deploymentUrl is required and must be a string');
        }

        if (!payload.environment || !['preview', 'production'].includes(payload.environment as string)) {
            errors.push('environment is required and must be either "preview" or "production"');
        }
    }

    /**
     * Validate app.exported payload
     */
    private validateAppExported(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.appId || typeof payload.appId !== 'string') {
            errors.push('appId is required and must be a string');
        }

        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (!payload.repositoryUrl || typeof payload.repositoryUrl !== 'string') {
            errors.push('repositoryUrl is required and must be a string');
        }

        if (typeof payload.isPrivate !== 'boolean') {
            errors.push('isPrivate is required and must be a boolean');
        }
    }

    /**
     * Validate app.error payload
     */
    private validateAppError(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.appId || typeof payload.appId !== 'string') {
            errors.push('appId is required and must be a string');
        }

        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (!payload.errorType || typeof payload.errorType !== 'string') {
            errors.push('errorType is required and must be a string');
        }

        if (!payload.errorMessage || typeof payload.errorMessage !== 'string') {
            errors.push('errorMessage is required and must be a string');
        }

        if (payload.stackTrace && typeof payload.stackTrace !== 'string') {
            errors.push('stackTrace must be a string');
        }
    }

    /**
     * Validate generation.complete payload
     */
    private validateGenerationComplete(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.appId || typeof payload.appId !== 'string') {
            errors.push('appId is required and must be a string');
        }

        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (typeof payload.filesGenerated !== 'number' || payload.filesGenerated < 0) {
            errors.push('filesGenerated is required and must be a non-negative number');
        }

        if (typeof payload.duration !== 'number' || payload.duration < 0) {
            errors.push('duration is required and must be a non-negative number');
        }
    }

    /**
     * Validate user.registered payload
     */
    private validateUserRegistered(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (!payload.email || typeof payload.email !== 'string') {
            errors.push('email is required and must be a string');
        }

        if (!payload.provider || typeof payload.provider !== 'string') {
            errors.push('provider is required and must be a string');
        }

        // Validate email format
        if (payload.email && typeof payload.email === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(payload.email)) {
                errors.push('email must be a valid email address');
            }
        }
    }

    /**
     * Validate user.verified payload
     */
    private validateUserVerified(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (!payload.email || typeof payload.email !== 'string') {
            errors.push('email is required and must be a string');
        }

        // Validate email format
        if (payload.email && typeof payload.email === 'string') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(payload.email)) {
                errors.push('email must be a valid email address');
            }
        }
    }

    /**
     * Validate payment.success payload
     */
    private validatePaymentSuccess(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (typeof payload.amount !== 'number' || payload.amount <= 0) {
            errors.push('amount is required and must be a positive number');
        }

        if (!payload.currency || typeof payload.currency !== 'string') {
            errors.push('currency is required and must be a string');
        }

        // Validate currency code (basic check)
        if (payload.currency && typeof payload.currency === 'string') {
            if (payload.currency.length !== 3) {
                errors.push('currency must be a 3-letter currency code (e.g., USD, EUR)');
            }
        }
    }

    /**
     * Validate payment.failed payload
     */
    private validatePaymentFailed(payload: Record<string, unknown>, errors: string[]): void {
        if (!payload.userId || typeof payload.userId !== 'string') {
            errors.push('userId is required and must be a string');
        }

        if (typeof payload.amount !== 'number' || payload.amount <= 0) {
            errors.push('amount is required and must be a positive number');
        }

        if (!payload.currency || typeof payload.currency !== 'string') {
            errors.push('currency is required and must be a string');
        }

        if (payload.reason && typeof payload.reason !== 'string') {
            errors.push('reason must be a string');
        }

        // Validate currency code (basic check)
        if (payload.currency && typeof payload.currency === 'string') {
            if (payload.currency.length !== 3) {
                errors.push('currency must be a 3-letter currency code (e.g., USD, EUR)');
            }
        }
    }

    /**
     * Validate and sanitize payload (removes invalid fields)
     */
    validateAndSanitize(
        eventType: WorkflowEventType,
        payload: Record<string, unknown>
    ): { valid: boolean; payload: Record<string, unknown>; errors: string[] } {
        const result = this.validate(eventType, payload);

        if (!result.valid) {
            return {
                valid: false,
                payload: {},
                errors: result.errors
            };
        }

        // Return sanitized payload (could add more sanitization logic here)
        return {
            valid: true,
            payload,
            errors: []
        };
    }
}

/**
 * Singleton instance for convenience
 */
let validatorInstance: EventPayloadValidator | null = null;

export function getValidator(): EventPayloadValidator {
    if (!validatorInstance) {
        validatorInstance = new EventPayloadValidator();
    }
    return validatorInstance;
}

/**
 * Helper function to validate a payload
 */
export function validatePayload(
    eventType: WorkflowEventType,
    payload: Record<string, unknown>
): ValidationResult {
    const validator = getValidator();
    return validator.validate(eventType, payload);
}
