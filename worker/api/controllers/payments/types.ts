/**
 * Type definitions for Payment Controller responses
 */

import { CryptoPayment, Chain, SubscriptionTier } from '../../../../src/api-types';

/**
 * Response data for initiateCryptoPayment
 */
export interface InitiateCryptoPaymentData {
  walletAddress: string;
  amount: number;
  currency: string;
  chain: Chain;
  expiresAt: number;
  paymentId: string;
  qrCode?: string;
}

/**
 * Response data for verifyCryptoPayment
 */
export interface VerifyCryptoPaymentData {
  verified: boolean;
  payment: CryptoPayment;
  subscription?: {
    id: string;
    tier: SubscriptionTier;
    status: string;
  };
  message: string;
}

/**
 * Response data for getPaymentHistory
 */
export interface PaymentHistoryData {
  payments: CryptoPayment[];
  total: number;
}

/**
 * Response data for getPaymentDetails
 */
export interface PaymentDetailsData {
  payment: CryptoPayment;
}

/**
 * Response data for cryptoWebhook
 */
export interface CryptoWebhookData {
  processed: boolean;
  paymentId?: string;
  message: string;
}

/**
 * Request body for initiate crypto payment
 */
export interface InitiateCryptoPaymentRequest {
  tier: SubscriptionTier;
  chain: Chain;
}

/**
 * Request body for verify crypto payment
 */
export interface VerifyCryptoPaymentRequest {
  txHash: string;
  chain: Chain;
}

/**
 * Request body for crypto webhook
 */
export interface CryptoWebhookRequest {
  txHash: string;
  confirmations: number;
  chain: Chain;
}
