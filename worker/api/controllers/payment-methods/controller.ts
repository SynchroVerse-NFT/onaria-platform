import { BaseController } from '../baseController';
import { ApiResponse, ControllerResponse } from '../types';
import { RouteContext } from '../../types/route-context';
import {
  PaymentMethodsData,
  PaymentMethodCreateData,
  PaymentMethodUpdateData,
  PaymentMethodDeleteData,
  CreatePaymentMethodRequest
} from './types';
import { createLogger } from '../../../logger';

const logger = createLogger('PaymentMethodController');

/**
 * Payment Methods Management Controller
 * Handles saved payment methods (wallets, cards)
 */
export class PaymentMethodController extends BaseController {
  static logger = logger;

  /**
   * GET /api/payment-methods
   * Get user's saved payment methods
   */
  static async getPaymentMethods(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<PaymentMethodsData>>> {
    try {
      const user = context.user!;

      // TODO: Get payment methods from database

      const paymentMethods = [];

      const responseData: PaymentMethodsData = {
        paymentMethods
      };

      return PaymentMethodController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error getting payment methods:', error);
      return PaymentMethodController.createErrorResponse<PaymentMethodsData>(
        'Failed to get payment methods',
        500
      );
    }
  }

  /**
   * POST /api/payment-methods
   * Save a new payment method
   */
  static async createPaymentMethod(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<PaymentMethodCreateData>>> {
    try {
      const user = context.user!;

      const bodyResult = await PaymentMethodController.parseJsonBody<CreatePaymentMethodRequest>(request);
      if (!bodyResult.success) {
        return bodyResult.response! as ControllerResponse<ApiResponse<PaymentMethodCreateData>>;
      }

      const { type, chain, walletAddress } = bodyResult.data!;

      // Validate wallet type requirements
      if (type === 'wallet' && (!chain || !walletAddress)) {
        return PaymentMethodController.createErrorResponse<PaymentMethodCreateData>(
          'Chain and wallet address are required for wallet payment methods',
          400
        );
      }

      // TODO: Validate wallet address format
      // TODO: Save payment method to database

      const paymentMethod = {
        id: `pm_${Date.now()}`,
        userId: user.id,
        type,
        chain,
        walletAddress,
        isDefault: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      const responseData: PaymentMethodCreateData = {
        paymentMethod,
        message: 'Payment method added successfully'
      };

      return PaymentMethodController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error creating payment method:', error);
      return PaymentMethodController.createErrorResponse<PaymentMethodCreateData>(
        'Failed to create payment method',
        500
      );
    }
  }

  /**
   * PUT /api/payment-methods/:id/default
   * Set payment method as default
   */
  static async setDefaultPaymentMethod(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<PaymentMethodUpdateData>>> {
    try {
      const user = context.user!;
      const paymentMethodId = context.params?.id;

      if (!paymentMethodId) {
        return PaymentMethodController.createErrorResponse<PaymentMethodUpdateData>(
          'Payment method ID is required',
          400
        );
      }

      // TODO: Verify payment method belongs to user
      // TODO: Update default status in database

      const paymentMethod = {
        id: paymentMethodId,
        userId: user.id,
        type: 'wallet' as const,
        chain: 'ethereum' as const,
        walletAddress: '0x123...',
        isDefault: true,
        isActive: true,
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now()
      };

      const responseData: PaymentMethodUpdateData = {
        paymentMethod,
        message: 'Default payment method updated'
      };

      return PaymentMethodController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error setting default payment method:', error);
      return PaymentMethodController.createErrorResponse<PaymentMethodUpdateData>(
        'Failed to set default payment method',
        500
      );
    }
  }

  /**
   * DELETE /api/payment-methods/:id
   * Remove a payment method
   */
  static async deletePaymentMethod(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<PaymentMethodDeleteData>>> {
    try {
      const user = context.user!;
      const paymentMethodId = context.params?.id;

      if (!paymentMethodId) {
        return PaymentMethodController.createErrorResponse<PaymentMethodDeleteData>(
          'Payment method ID is required',
          400
        );
      }

      // TODO: Verify payment method belongs to user
      // TODO: Check if payment method is used in active subscription
      // TODO: Delete payment method from database

      const responseData: PaymentMethodDeleteData = {
        success: true,
        message: 'Payment method removed successfully'
      };

      return PaymentMethodController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error deleting payment method:', error);
      return PaymentMethodController.createErrorResponse<PaymentMethodDeleteData>(
        'Failed to delete payment method',
        500
      );
    }
  }
}
