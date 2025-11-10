/**
 * Payment Service
 * Handles database operations for subscriptions and crypto payments
 */

import { BaseService } from './BaseService';
import {
    subscriptions,
    cryptoPayments,
    paymentMethods,
    Subscription,
    CryptoPayment,
    NewSubscription,
    NewCryptoPayment
} from '../schema';
import { eq, and, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface CreateSubscriptionInput {
    userId: string;
    planType: 'free' | 'starter' | 'pro' | 'enterprise';
    billingCycle: 'monthly' | 'yearly' | 'lifetime';
    amountPaid?: number;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
}

export interface UpdateSubscriptionInput {
    status?: 'active' | 'pending' | 'expired' | 'cancelled' | 'past_due';
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    autoRenew?: boolean;
    cancelledAt?: Date;
    cancellationReason?: string;
}

export interface CreateCryptoPaymentInput {
    userId: string;
    subscriptionId?: string;
    txHash: string;
    chain: 'ethereum' | 'solana' | 'polygon' | 'base';
    fromAddress: string;
    toAddress: string;
    amount: string;
    currency: string;
    amountUsd: number;
    blockNumber?: number;
    confirmations?: number;
    blockTimestamp?: number;
}

export interface UpdateCryptoPaymentInput {
    status?: 'pending' | 'confirming' | 'verified' | 'failed' | 'expired';
    confirmations?: number;
    verifiedAt?: Date;
    failureReason?: string;
}

/**
 * Payment Service Class
 */
export class PaymentService extends BaseService {
    /**
     * Create a new subscription
     */
    async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
        try {
            const now = new Date();
            const id = nanoid();

            const newSubscription: NewSubscription = {
                id,
                userId: input.userId,
                planType: input.planType,
                billingCycle: input.billingCycle,
                status: 'pending',
                amountPaid: input.amountPaid || null,
                currency: 'USD',
                currentPeriodStart: input.currentPeriodStart || null,
                currentPeriodEnd: input.currentPeriodEnd || null,
                autoRenew: false,
                createdAt: now,
                updatedAt: now
            };

            const result = await this.database
                .insert(subscriptions)
                .values(newSubscription)
                .returning();

            this.logger.info('Created subscription', { subscriptionId: id, userId: input.userId });
            return result[0];
        } catch (error) {
            this.handleDatabaseError(error, 'createSubscription', { input });
        }
    }

    /**
     * Get subscription by ID
     */
    async getSubscriptionById(subscriptionId: string): Promise<Subscription | null> {
        try {
            const result = await this.database
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.id, subscriptionId))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getSubscriptionById', { subscriptionId });
        }
    }

    /**
     * Get active subscription for user
     */
    async getActiveSubscription(userId: string): Promise<Subscription | null> {
        try {
            const result = await this.database
                .select()
                .from(subscriptions)
                .where(
                    and(
                        eq(subscriptions.userId, userId),
                        eq(subscriptions.status, 'active')
                    )
                )
                .orderBy(desc(subscriptions.createdAt))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getActiveSubscription', { userId });
        }
    }

    /**
     * Get all subscriptions for user
     */
    async getUserSubscriptions(userId: string): Promise<Subscription[]> {
        try {
            return await this.database
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.userId, userId))
                .orderBy(desc(subscriptions.createdAt));
        } catch (error) {
            this.handleDatabaseError(error, 'getUserSubscriptions', { userId });
        }
    }

    /**
     * Update subscription
     */
    async updateSubscription(
        subscriptionId: string,
        updates: UpdateSubscriptionInput
    ): Promise<Subscription> {
        try {
            const result = await this.database
                .update(subscriptions)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(subscriptions.id, subscriptionId))
                .returning();

            this.logger.info('Updated subscription', { subscriptionId, updates });
            return result[0];
        } catch (error) {
            this.handleDatabaseError(error, 'updateSubscription', { subscriptionId, updates });
        }
    }

    /**
     * Create a new crypto payment record
     */
    async createCryptoPayment(input: CreateCryptoPaymentInput): Promise<CryptoPayment> {
        try {
            const now = new Date();
            const id = nanoid();

            const newPayment: NewCryptoPayment = {
                id,
                userId: input.userId,
                subscriptionId: input.subscriptionId || null,
                txHash: input.txHash,
                chain: input.chain,
                fromAddress: input.fromAddress,
                toAddress: input.toAddress,
                amount: input.amount,
                currency: input.currency,
                amountUsd: input.amountUsd,
                blockNumber: input.blockNumber || null,
                confirmations: input.confirmations || 0,
                blockTimestamp: input.blockTimestamp ? new Date(input.blockTimestamp * 1000) : null,
                status: 'pending',
                createdAt: now,
                updatedAt: now
            };

            const result = await this.database
                .insert(cryptoPayments)
                .values(newPayment)
                .returning();

            this.logger.info('Created crypto payment', { paymentId: id, txHash: input.txHash });
            return result[0];
        } catch (error) {
            this.handleDatabaseError(error, 'createCryptoPayment', { input });
        }
    }

    /**
     * Get crypto payment by transaction hash
     */
    async getCryptoPaymentByTxHash(txHash: string): Promise<CryptoPayment | null> {
        try {
            const result = await this.database
                .select()
                .from(cryptoPayments)
                .where(eq(cryptoPayments.txHash, txHash))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getCryptoPaymentByTxHash', { txHash });
        }
    }

    /**
     * Get crypto payment by ID
     */
    async getCryptoPaymentById(paymentId: string): Promise<CryptoPayment | null> {
        try {
            const result = await this.database
                .select()
                .from(cryptoPayments)
                .where(eq(cryptoPayments.id, paymentId))
                .limit(1);

            return result[0] || null;
        } catch (error) {
            this.handleDatabaseError(error, 'getCryptoPaymentById', { paymentId });
        }
    }

    /**
     * Get all crypto payments for user
     */
    async getUserCryptoPayments(userId: string): Promise<CryptoPayment[]> {
        try {
            return await this.database
                .select()
                .from(cryptoPayments)
                .where(eq(cryptoPayments.userId, userId))
                .orderBy(desc(cryptoPayments.createdAt));
        } catch (error) {
            this.handleDatabaseError(error, 'getUserCryptoPayments', { userId });
        }
    }

    /**
     * Update crypto payment
     */
    async updateCryptoPayment(
        paymentId: string,
        updates: UpdateCryptoPaymentInput
    ): Promise<CryptoPayment> {
        try {
            const result = await this.database
                .update(cryptoPayments)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(cryptoPayments.id, paymentId))
                .returning();

            this.logger.info('Updated crypto payment', { paymentId, updates });
            return result[0];
        } catch (error) {
            this.handleDatabaseError(error, 'updateCryptoPayment', { paymentId, updates });
        }
    }

    /**
     * Check if transaction hash has been used before (prevent double-spend)
     */
    async isTransactionUsed(txHash: string): Promise<boolean> {
        try {
            const result = await this.database
                .select()
                .from(cryptoPayments)
                .where(eq(cryptoPayments.txHash, txHash))
                .limit(1);

            return result.length > 0;
        } catch (error) {
            this.handleDatabaseError(error, 'isTransactionUsed', { txHash });
        }
    }

    /**
     * Calculate subscription end date based on billing cycle
     */
    calculateSubscriptionEndDate(startDate: Date, billingCycle: 'monthly' | 'yearly' | 'lifetime'): Date | null {
        if (billingCycle === 'lifetime') {
            return null; // Lifetime subscriptions don't expire
        }

        const endDate = new Date(startDate);

        if (billingCycle === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (billingCycle === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }

        return endDate;
    }

    /**
     * Get pending payments that need confirmation updates
     */
    async getPendingPayments(): Promise<CryptoPayment[]> {
        try {
            return await this.database
                .select()
                .from(cryptoPayments)
                .where(
                    and(
                        eq(cryptoPayments.status, 'pending'),
                        // Only get payments from last 24 hours
                        // Note: This requires SQLite date functions
                    )
                )
                .orderBy(desc(cryptoPayments.createdAt));
        } catch (error) {
            this.handleDatabaseError(error, 'getPendingPayments');
        }
    }
}
