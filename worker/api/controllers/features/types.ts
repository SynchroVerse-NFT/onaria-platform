/**
 * Type definitions for Features Controller responses
 */

import { SubscriptionTier } from '../../../../src/api-types';
import { TierFeatures } from '../../../services/subscription/TierConfig';

/**
 * Response data for getAvailableFeatures
 */
export interface AvailableFeaturesData {
  features: string[];
  tier: SubscriptionTier;
  limits: TierFeatures;
  featureDetails: Array<{
    name: string;
    enabled: boolean;
    description?: string;
  }>;
}

/**
 * Response data for checkFeatureAccess
 */
export interface FeatureCheckData {
  feature: string;
  available: boolean;
  tier: SubscriptionTier;
  reason?: string;
}

/**
 * Request body for checking multiple features
 */
export interface CheckFeaturesRequest {
  features: string[];
}

/**
 * Response data for checking multiple features
 */
export interface CheckFeaturesData {
  features: Record<string, boolean>;
  tier: SubscriptionTier;
}
