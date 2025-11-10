/**
 * Type definitions for Payment Methods Controller responses
 */

import { PaymentMethod, Chain } from '../../../../src/api-types';

/**
 * Response data for getPaymentMethods
 */
export interface PaymentMethodsData {
  paymentMethods: PaymentMethod[];
}

/**
 * Response data for createPaymentMethod
 */
export interface PaymentMethodCreateData {
  paymentMethod: PaymentMethod;
  message: string;
}

/**
 * Response data for setDefaultPaymentMethod
 */
export interface PaymentMethodUpdateData {
  paymentMethod: PaymentMethod;
  message: string;
}

/**
 * Response data for deletePaymentMethod
 */
export interface PaymentMethodDeleteData {
  success: boolean;
  message: string;
}

/**
 * Request body for create payment method
 */
export interface CreatePaymentMethodRequest {
  type: 'wallet' | 'stripe';
  chain?: Chain;
  walletAddress?: string;
}
