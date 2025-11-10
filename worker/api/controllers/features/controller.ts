import { BaseController } from '../baseController';
import { ApiResponse, ControllerResponse } from '../types';
import { RouteContext } from '../../types/route-context';
import {
  AvailableFeaturesData,
  FeatureCheckData
} from './types';
import { SubscriptionTier } from '../../../../src/api-types';
import { createLogger } from '../../../logger';

const logger = createLogger('FeaturesController');

/**
 * Feature Access Controller
 * Handles feature availability and access control
 */
export class FeaturesController extends BaseController {
  static logger = logger;

  /**
   * Feature map by tier
   */
  private static readonly TIER_FEATURES: Record<SubscriptionTier, string[]> = {
    free: [
      'basic_apps',
      'public_templates',
      'community_support'
    ],
    pro: [
      'basic_apps',
      'public_templates',
      'community_support',
      'unlimited_apps',
      'private_apps',
      'custom_domains',
      'priority_support',
      'advanced_analytics'
    ],
    business: [
      'basic_apps',
      'public_templates',
      'community_support',
      'unlimited_apps',
      'private_apps',
      'custom_domains',
      'priority_support',
      'advanced_analytics',
      'team_collaboration',
      'sso',
      'audit_logs',
      'dedicated_support'
    ],
    enterprise: [
      'basic_apps',
      'public_templates',
      'community_support',
      'unlimited_apps',
      'private_apps',
      'custom_domains',
      'priority_support',
      'advanced_analytics',
      'team_collaboration',
      'sso',
      'audit_logs',
      'dedicated_support',
      'custom_sla',
      'on_premise',
      'white_label',
      'advanced_security'
    ],
    byok: [
      'basic_apps',
      'public_templates',
      'community_support',
      'unlimited_apps',
      'private_apps',
      'custom_models',
      'no_platform_costs'
    ]
  };

  /**
   * GET /api/features
   * Get available features for current subscription
   */
  static async getAvailableFeatures(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<AvailableFeaturesData>>> {
    try {
      const user = context.user!;

      // TODO: Get user's subscription tier from database
      const tier: SubscriptionTier = 'free';

      const features = this.TIER_FEATURES[tier] || [];

      const featureDetails = features.map(feature => ({
        name: feature,
        enabled: true,
        description: this.getFeatureDescription(feature)
      }));

      const responseData: AvailableFeaturesData = {
        features,
        tier,
        featureDetails
      };

      return FeaturesController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error getting available features:', error);
      return FeaturesController.createErrorResponse<AvailableFeaturesData>(
        'Failed to get available features',
        500
      );
    }
  }

  /**
   * GET /api/features/:featureName/check
   * Check if user has access to specific feature
   */
  static async checkFeatureAccess(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    context: RouteContext
  ): Promise<ControllerResponse<ApiResponse<FeatureCheckData>>> {
    try {
      const user = context.user!;
      const featureName = context.params?.featureName;

      if (!featureName) {
        return FeaturesController.createErrorResponse<FeatureCheckData>(
          'Feature name is required',
          400
        );
      }

      // TODO: Get user's subscription tier from database
      const currentTier: SubscriptionTier = 'free';

      const hasAccess = this.TIER_FEATURES[currentTier]?.includes(featureName) || false;

      let requiresTier: SubscriptionTier | undefined;
      if (!hasAccess) {
        // Find minimum tier that has this feature
        for (const [tier, features] of Object.entries(this.TIER_FEATURES)) {
          if (features.includes(featureName)) {
            requiresTier = tier as SubscriptionTier;
            break;
          }
        }
      }

      const responseData: FeatureCheckData = {
        hasAccess,
        requiresTier,
        currentTier,
        message: hasAccess
          ? 'Access granted'
          : requiresTier
            ? `This feature requires ${requiresTier} tier or higher`
            : 'Feature not available'
      };

      return FeaturesController.createSuccessResponse(responseData);
    } catch (error) {
      this.logger.error('Error checking feature access:', error);
      return FeaturesController.createErrorResponse<FeatureCheckData>(
        'Failed to check feature access',
        500
      );
    }
  }

  /**
   * Get human-readable feature description
   */
  private static getFeatureDescription(feature: string): string {
    const descriptions: Record<string, string> = {
      basic_apps: 'Create basic applications',
      public_templates: 'Access to public templates',
      community_support: 'Community support access',
      unlimited_apps: 'Create unlimited applications',
      private_apps: 'Private application hosting',
      custom_domains: 'Use custom domains',
      priority_support: 'Priority customer support',
      advanced_analytics: 'Advanced analytics and insights',
      team_collaboration: 'Team collaboration features',
      sso: 'Single sign-on (SSO)',
      audit_logs: 'Audit logs and compliance',
      dedicated_support: 'Dedicated support team',
      custom_sla: 'Custom SLA agreements',
      on_premise: 'On-premise deployment',
      white_label: 'White-label branding',
      advanced_security: 'Advanced security features',
      custom_models: 'Bring your own AI models',
      no_platform_costs: 'No platform AI costs'
    };

    return descriptions[feature] || feature;
  }
}
