import { BaseController } from '../baseController';
import { ApiResponse, ControllerResponse } from '../types';
import { RouteContext } from '../../types/route-context';
import {
  InitiateCryptoPaymentData,
  VerifyCryptoPaymentData,
  PaymentHistoryData,
  PaymentDetailsData,
  CryptoWebhookData,
  InitiateCryptoPaymentRequest,
  VerifyCryptoPaymentRequest,
  CryptoWebhookRequest
} from './types';
import { createLogger } from '../../../logger';
import { PaymentService } from '../../../database/services/PaymentService';
import { createChainFactory } from '../../../services/blockchain/ChainFactory';
import { getPriceOracle } from '../../../services/blockchain/PriceOracle';
import { TransactionVerificationError } from '../../../services/blockchain/ChainService';

const logger = createLogger('PaymentController');

/**
 * Payment Management Controller
 * Handles crypto payments, verification, and payment history
 */
export class PaymentController extends BaseController {
  static logger = logger;

  /**
   * POST /api/payments/crypto/initiate
   * Initiate a crypto payment for subscription
   */
  static async initiateCryptoPayment(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<InitiateCryptoPaymentData>>> {
    try {
      const user = context.user!;

      const bodyResult = await PaymentController.parseJsonBody<InitiateCryptoPaymentRequest>(request);
      if (!bodyResult.success) {
        return bodyResult.response! as ControllerResponse<ApiResponse<InitiateCryptoPaymentData>>;
      }

      const { tier, chain } = bodyResult.data!;

      // TODO: Get platform wallet address for the specified chain
      // TODO: Calculate amount based on tier and current prices
      // TODO: Create payment record in database

      const platformWallets: Record<string, string> = {
        ethereum: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        solana: 'SoL1111111111111111111111111111111111111112',
        polygon: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        base: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
      };

      const tierPricing = {
        free: 0,
        pro: 29,
        business: 99,
        enterprise: 299,
        byok: 0
      };

      const amount = tierPricing[tier];
      const currency = chain === 'solana' ? 'SOL' : 'ETH';
      const expiresAt = Date.now() + 3600000; // 1 hour
      const paymentId = `pay_${Date.now()}_${user.id}`;

      const responseData: InitiateCryptoPaymentData = {
        walletAddress: platformWallets[chain],
        amount,
        currency,
        chain,
        expiresAt,
        paymentId
      };

      return PaymentController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error initiating crypto payment:', error);
      return PaymentController.createErrorResponse<InitiateCryptoPaymentData>(
        'Failed to initiate payment',
        500
      );
    }
  }

  /**
   * POST /api/payments/crypto/verify
   * Verify a crypto payment transaction
   */
  static async verifyCryptoPayment(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<VerifyCryptoPaymentData>>> {
    try {
      const user = context.user!;

      const bodyResult = await PaymentController.parseJsonBody<VerifyCryptoPaymentRequest>(request);
      if (!bodyResult.success) {
        return bodyResult.response! as ControllerResponse<ApiResponse<VerifyCryptoPaymentData>>;
      }

      const { txHash, chain } = bodyResult.data!;

      this.logger.info('Verifying crypto payment', { userId: user.id, txHash, chain });

      const paymentService = new PaymentService(env);
      const chainFactory = createChainFactory(env);
      const priceOracle = getPriceOracle();

      if (!chainFactory.isValidTxHash(chain, txHash)) {
        return PaymentController.createErrorResponse<VerifyCryptoPaymentData>(
          'Invalid transaction hash format for specified chain',
          400
        );
      }

      const existingPayment = await paymentService.isTransactionUsed(txHash);
      if (existingPayment) {
        return PaymentController.createErrorResponse<VerifyCryptoPaymentData>(
          'Transaction has already been used',
          409
        );
      }

      const txDetails = await chainFactory.getTransactionDetails(chain, txHash);

      if (txDetails.status === 'failed') {
        const failedPayment = await paymentService.createCryptoPayment({
          userId: user.id,
          txHash,
          chain,
          fromAddress: txDetails.fromAddress,
          toAddress: txDetails.toAddress,
          amount: txDetails.amount,
          currency: txDetails.currency,
          amountUsd: 0,
          blockNumber: txDetails.blockNumber,
          confirmations: txDetails.confirmations,
          blockTimestamp: txDetails.blockTimestamp
        });

        await paymentService.updateCryptoPayment(failedPayment.id, {
          status: 'failed',
          failureReason: 'Transaction failed on blockchain'
        });

        return PaymentController.createErrorResponse<VerifyCryptoPaymentData>(
          'Transaction failed on blockchain',
          400
        );
      }

      const platformWallet = chainFactory.getPlatformWallet(chain);
      if (txDetails.toAddress.toLowerCase() !== platformWallet.toLowerCase()) {
        return PaymentController.createErrorResponse<VerifyCryptoPaymentData>(
          `Wrong recipient address. Expected: ${platformWallet}`,
          400
        );
      }

      const currency = chainFactory.getNativeCurrency(chain) as 'ETH' | 'SOL' | 'MATIC';
      const amountUsd = await priceOracle.convertToUSD(parseFloat(txDetails.amount), currency);

      const chainService = chainFactory.getChainService(chain);
      const hasMinConfirmations = chainService.hasMinimumConfirmations(txDetails.confirmations);

      const payment = await paymentService.createCryptoPayment({
        userId: user.id,
        txHash,
        chain,
        fromAddress: txDetails.fromAddress,
        toAddress: txDetails.toAddress,
        amount: txDetails.amount,
        currency: txDetails.currency,
        amountUsd,
        blockNumber: txDetails.blockNumber,
        confirmations: txDetails.confirmations,
        blockTimestamp: txDetails.blockTimestamp
      });

      if (!hasMinConfirmations) {
        await paymentService.updateCryptoPayment(payment.id, {
          status: 'confirming'
        });

        const responseData: VerifyCryptoPaymentData = {
          verified: false,
          payment,
          message: `Payment pending confirmation. ${txDetails.confirmations} of ${chainService['config'].minConfirmations} confirmations received.`
        };

        return PaymentController.createSuccessResponse(responseData);
      }

      const tierPricing: Record<string, number> = {
        free: 0,
        pro: 29,
        business: 99,
        enterprise: 299
      };

      let activatedTier: 'pro' | 'business' | 'enterprise' | null = null;
      for (const [tier, price] of Object.entries(tierPricing)) {
        if (tier === 'free') continue;
        if (priceOracle.isWithinTolerance(amountUsd, price, 5)) {
          activatedTier = tier as 'pro' | 'business' | 'enterprise';
          break;
        }
      }

      if (!activatedTier) {
        await paymentService.updateCryptoPayment(payment.id, {
          status: 'failed',
          failureReason: `Amount ${amountUsd} USD does not match any tier pricing`
        });

        return PaymentController.createErrorResponse<VerifyCryptoPaymentData>(
          `Payment amount ${amountUsd} USD does not match any subscription tier`,
          400
        );
      }

      const billingCycle: 'monthly' | 'yearly' = amountUsd >= 99 ? 'yearly' : 'monthly';
      const now = new Date();
      const periodEnd = paymentService.calculateSubscriptionEndDate(now, billingCycle);

      const subscription = await paymentService.createSubscription({
        userId: user.id,
        planType: activatedTier,
        billingCycle,
        amountPaid: amountUsd,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd || undefined
      });

      await paymentService.updateSubscription(subscription.id, {
        status: 'active'
      });

      await paymentService.updateCryptoPayment(payment.id, {
        status: 'verified',
        verifiedAt: new Date()
      });

      this.logger.info('Payment verified and subscription activated', {
        userId: user.id,
        paymentId: payment.id,
        subscriptionId: subscription.id,
        tier: activatedTier
      });

      const updatedPayment = await paymentService.getCryptoPaymentById(payment.id);

      const responseData: VerifyCryptoPaymentData = {
        verified: true,
        payment: updatedPayment!,
        subscription: {
          id: subscription.id,
          tier: activatedTier,
          status: 'active'
        },
        message: `Payment verified successfully. ${activatedTier} subscription activated.`
      };

      return PaymentController.createSuccessResponse(responseData);
    } catch (error) {
      if (error instanceof TransactionVerificationError) {
        this.logger.warn('Transaction verification failed', { error: error.message, reason: error.reason });
        return PaymentController.createErrorResponse<VerifyCryptoPaymentData>(
          error.message,
          400
        );
      }

      this.logger.error('Error verifying crypto payment:', error);
      return PaymentController.createErrorResponse<VerifyCryptoPaymentData>(
        'Failed to verify payment',
        500
      );
    }
  }

  /**
   * GET /api/payments/history
   * Get user's payment history
   */
  static async getPaymentHistory(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<PaymentHistoryData>>> {
    try {
      const user = context.user!;

      const paymentService = new PaymentService(env);
      const payments = await paymentService.getUserCryptoPayments(user.id);

      const responseData: PaymentHistoryData = {
        payments,
        total: payments.length
      };

      return PaymentController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error getting payment history:', error);
      return PaymentController.createErrorResponse<PaymentHistoryData>(
        'Failed to get payment history',
        500
      );
    }
  }

  /**
   * GET /api/payments/:id
   * Get specific payment details
   */
  static async getPaymentDetails(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<PaymentDetailsData>>> {
    try {
      const user = context.user!;
      const paymentId = context.params?.id;

      if (!paymentId) {
        return PaymentController.createErrorResponse<PaymentDetailsData>(
          'Payment ID is required',
          400
        );
      }

      // TODO: Get payment from database
      // TODO: Verify payment belongs to user

      const payment = {
        id: paymentId,
        userId: user.id,
        chain: 'ethereum' as const,
        walletAddress: user.id,
        txHash: '0x123abc...',
        amount: 29,
        currency: 'ETH',
        usdValue: 29,
        status: 'confirmed' as const,
        confirmations: 12,
        requiredConfirmations: 12,
        createdAt: Date.now() - 86400000,
        confirmedAt: Date.now() - 86400000 + 600000
      };

      const responseData: PaymentDetailsData = {
        payment
      };

      return PaymentController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error getting payment details:', error);
      return PaymentController.createErrorResponse<PaymentDetailsData>(
        'Failed to get payment details',
        500
      );
    }
  }

  /**
   * POST /api/payments/crypto/webhook
   * Internal webhook for async payment confirmations
   */
  static async cryptoWebhook(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<CryptoWebhookData>>> {
    try {
      const bodyResult = await PaymentController.parseJsonBody<CryptoWebhookRequest>(request);
      if (!bodyResult.success) {
        return bodyResult.response! as ControllerResponse<ApiResponse<CryptoWebhookData>>;
      }

      const { txHash, confirmations, chain } = bodyResult.data!;

      this.logger.info('Processing payment webhook', { txHash, confirmations, chain });

      const paymentService = new PaymentService(env);
      const chainFactory = createChainFactory(env);

      const payment = await paymentService.getCryptoPaymentByTxHash(txHash);

      if (!payment) {
        return PaymentController.createErrorResponse<CryptoWebhookData>(
          'Payment not found',
          404
        );
      }

      if (payment.status === 'verified') {
        return PaymentController.createSuccessResponse({
          processed: true,
          paymentId: payment.id,
          message: 'Payment already verified'
        });
      }

      const updatedPayment = await paymentService.updateCryptoPayment(payment.id, {
        confirmations
      });

      const chainService = chainFactory.getChainService(chain);
      const hasMinConfirmations = chainService.hasMinimumConfirmations(confirmations);

      if (hasMinConfirmations && payment.status === 'confirming') {
        await paymentService.updateCryptoPayment(payment.id, {
          status: 'verified',
          verifiedAt: new Date()
        });

        if (payment.subscriptionId) {
          await paymentService.updateSubscription(payment.subscriptionId, {
            status: 'active'
          });
        }

        this.logger.info('Payment verified via webhook', {
          paymentId: payment.id,
          txHash,
          confirmations
        });
      }

      const responseData: CryptoWebhookData = {
        processed: true,
        paymentId: payment.id,
        message: `Payment updated with ${confirmations} confirmations`
      };

      return PaymentController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error processing crypto webhook:', error);
      return PaymentController.createErrorResponse<CryptoWebhookData>(
        'Failed to process webhook',
        500
      );
    }
  }
}
