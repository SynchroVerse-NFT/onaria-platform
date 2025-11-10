/**
 * Type definitions for Billing Controller responses
 */

import { BillingRecord } from '../../../../src/api-types';

/**
 * Response data for getBillingHistory
 */
export interface BillingHistoryData {
  history: BillingRecord[];
  total: number;
  totalPaid: number;
  totalRefunded: number;
}

/**
 * Response data for getInvoice
 */
export interface InvoiceDetailsData {
  invoice: BillingRecord;
  downloadUrl?: string;
  isPaid: boolean;
  canDownload: boolean;
}

/**
 * Response data for getNextBilling
 */
export interface NextBillingData {
  nextBillingDate: number;
  amount: number;
  currency: string;
  paymentMethodId?: string;
  subscriptionTier: string;
  autoRenew: boolean;
}

/**
 * Request query parameters for billing history
 */
export interface BillingHistoryQuery {
  limit?: number;
  offset?: number;
  type?: 'subscription' | 'upgrade' | 'overage' | 'refund';
  status?: 'paid' | 'pending' | 'failed' | 'refunded';
}
