import { BaseController } from '../baseController';
import { ApiResponse, ControllerResponse } from '../types';
import { RouteContext } from '../../types/route-context';
import {
  CurrentSubscriptionData,
  UpgradeSubscriptionData,
  DowngradeSubscriptionData,
  CancelSubscriptionData,
  ReactivateSubscriptionData,
  UpgradeSubscriptionRequest,
  DowngradeSubscriptionRequest
} from './types';
import { SubscriptionTier } from '../../../../src/api-types';
import { createLogger } from '../../../logger';

const logger = createLogger('SubscriptionController');

/**
 * Subscription Management Controller
 * Handles subscription lifecycle, upgrades, downgrades, and cancellations
 */
export class SubscriptionController extends BaseController {
  static logger = logger;

  /**
   * GET /api/subscriptions/current
   * Get user's current subscription with usage and limits
   */
  static async getCurrentSubscription(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<CurrentSubscriptionData>>> {
    try {
      const user = context.user!;

      // TODO: Replace with actual service calls
      // For now, return mock data structure
      const subscription = {
        id: `sub_${user.id}`,
        userId: user.id,
        tier: 'free' as SubscriptionTier,
        status: 'active' as const,
        startDate: Date.now() - 86400000 * 30,
        autoRenew: true,
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      };

      const usage = {
        aiGenerations: 5,
        appsCreated: 3,
        workflowExecutions: 0,
        estimatedCost: 0
      };

      const limits = {
        aiGenerations: 10,
        appsCreated: 5,
        workflowExecutions: 100
      };

      const responseData: CurrentSubscriptionData = {
        subscription,
        usage,
        limits
      };

      return SubscriptionController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error getting current subscription:', error);
      return SubscriptionController.createErrorResponse<CurrentSubscriptionData>(
        'Failed to get subscription',
        500
      );
    }
  }

  /**
   * POST /api/subscriptions/upgrade
   * Upgrade to a higher tier
   */
  static async upgradeSubscription(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<UpgradeSubscriptionData>>> {
    try {
      const user = context.user!;

      const bodyResult = await SubscriptionController.parseJsonBody<UpgradeSubscriptionRequest>(request);
      if (!bodyResult.success) {
        return bodyResult.response! as ControllerResponse<ApiResponse<UpgradeSubscriptionData>>;
      }

      const { tier, paymentMethodId } = bodyResult.data!;

      // Validate tier upgrade
      const tierHierarchy: SubscriptionTier[] = ['free', 'pro', 'business', 'enterprise', 'byok'];

      // TODO: Get current tier from database
      const currentTierIndex = 0; // Assuming free
      const newTierIndex = tierHierarchy.indexOf(tier);

      if (newTierIndex <= currentTierIndex) {
        return SubscriptionController.createErrorResponse<UpgradeSubscriptionData>(
          'Cannot upgrade to same or lower tier',
          400
        );
      }

      // TODO: Calculate pricing and check if payment is required
      const requiresPayment = tier !== 'byok';

      const subscription = {
        id: `sub_${user.id}`,
        userId: user.id,
        tier,
        status: 'active' as const,
        startDate: Date.now(),
        autoRenew: true,
        paymentMethodId,
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      };

      const responseData: UpgradeSubscriptionData = {
        subscription,
        requiresPayment,
        paymentAmount: requiresPayment ? 2900 : undefined,
        message: `Successfully upgraded to ${tier} tier`
      };

      return SubscriptionController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error upgrading subscription:', error);
      return SubscriptionController.createErrorResponse<UpgradeSubscriptionData>(
        'Failed to upgrade subscription',
        500
      );
    }
  }

  /**
   * POST /api/subscriptions/downgrade
   * Schedule downgrade at end of billing cycle
   */
  static async downgradeSubscription(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<DowngradeSubscriptionData>>> {
    try {
      const user = context.user!;

      const bodyResult = await SubscriptionController.parseJsonBody<DowngradeSubscriptionRequest>(request);
      if (!bodyResult.success) {
        return bodyResult.response! as ControllerResponse<ApiResponse<DowngradeSubscriptionData>>;
      }

      const { tier } = bodyResult.data!;

      // TODO: Validate downgrade is to lower tier
      // TODO: Schedule downgrade at end of current billing period

      const effectiveDate = Date.now() + 86400000 * 30; // 30 days from now

      const subscription = {
        id: `sub_${user.id}`,
        userId: user.id,
        tier: 'pro' as SubscriptionTier, // Current tier
        status: 'active' as const,
        startDate: Date.now() - 86400000 * 30,
        autoRenew: true,
        scheduledTier: tier,
        scheduledChangeDate: effectiveDate,
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      };

      const responseData: DowngradeSubscriptionData = {
        subscription,
        effectiveDate,
        message: `Downgrade to ${tier} tier scheduled for end of billing cycle`
      };

      return SubscriptionController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error downgrading subscription:', error);
      return SubscriptionController.createErrorResponse<DowngradeSubscriptionData>(
        'Failed to downgrade subscription',
        500
      );
    }
  }

  /**
   * POST /api/subscriptions/cancel
   * Cancel subscription (remains active until end date)
   */
  static async cancelSubscription(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<CancelSubscriptionData>>> {
    try {
      const user = context.user!;

      // TODO: Cancel subscription in database
      const expiresAt = Date.now() + 86400000 * 30; // 30 days from now

      const subscription = {
        id: `sub_${user.id}`,
        userId: user.id,
        tier: 'pro' as SubscriptionTier,
        status: 'cancelled' as const,
        startDate: Date.now() - 86400000 * 30,
        endDate: expiresAt,
        autoRenew: false,
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      };

      const responseData: CancelSubscriptionData = {
        subscription,
        expiresAt,
        message: 'Subscription cancelled. Access will remain active until end of billing period'
      };

      return SubscriptionController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error cancelling subscription:', error);
      return SubscriptionController.createErrorResponse<CancelSubscriptionData>(
        'Failed to cancel subscription',
        500
      );
    }
  }

  /**
   * POST /api/subscriptions/reactivate
   * Reactivate a cancelled subscription
   */
  static async reactivateSubscription(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<ReactivateSubscriptionData>>> {
    try {
      const user = context.user!;

      // TODO: Reactivate subscription in database

      const subscription = {
        id: `sub_${user.id}`,
        userId: user.id,
        tier: 'pro' as SubscriptionTier,
        status: 'active' as const,
        startDate: Date.now() - 86400000 * 30,
        autoRenew: true,
        createdAt: Date.now() - 86400000 * 30,
        updatedAt: Date.now()
      };

      const responseData: ReactivateSubscriptionData = {
        subscription,
        message: 'Subscription reactivated successfully'
      };

      return SubscriptionController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error reactivating subscription:', error);
      return SubscriptionController.createErrorResponse<ReactivateSubscriptionData>(
        'Failed to reactivate subscription',
        500
      );
    }
  }
}
