/**
 * Subscription Tier Configuration
 * Defines limits, features, and pricing for each subscription tier
 */

import { SubscriptionTier } from '../../../src/api-types';

export interface TierFeatures {
  maxApps: number; // -1 for unlimited
  aiGenerationsPerMonth: number; // -1 for unlimited
  workflowExecutionsPerMonth: number;
  maxTeamMembers?: number;
  customDomains?: number;
  features: string[];
  price: number | null; // null for custom pricing (enterprise)
}

export interface TierConfig {
  [key: string]: TierFeatures;
}

/**
 * Tier limits and features configuration
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierFeatures> = {
  free: {
    maxApps: 5,
    aiGenerationsPerMonth: 100,
    workflowExecutionsPerMonth: 0,
    maxTeamMembers: 1,
    customDomains: 0,
    features: [
      'basic_templates',
      'public_deployments',
      'community_support',
      'basic_analytics'
    ],
    price: 0
  },
  pro: {
    maxApps: 50,
    aiGenerationsPerMonth: 2000,
    workflowExecutionsPerMonth: 500,
    maxTeamMembers: 1,
    customDomains: 3,
    features: [
      'all_templates',
      'custom_domains',
      'github_sync',
      'priority_generation',
      'email_support',
      'advanced_analytics',
      'private_deployments',
      'api_access'
    ],
    price: 20
  },
  business: {
    maxApps: -1, // unlimited
    aiGenerationsPerMonth: 10000,
    workflowExecutionsPerMonth: 5000,
    maxTeamMembers: 10,
    customDomains: 10,
    features: [
      'all_pro_features',
      'white_label',
      'team_collaboration',
      'n8n_workflows',
      'private_deployments',
      'sla',
      'advanced_security',
      'audit_logs',
      'priority_support'
    ],
    price: 99
  },
  enterprise: {
    maxApps: -1, // unlimited
    aiGenerationsPerMonth: -1, // unlimited
    workflowExecutionsPerMonth: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    customDomains: -1, // unlimited
    features: [
      'all_business_features',
      'custom_ai_models',
      'dedicated_support',
      'sso',
      'custom_integrations',
      'on_premise_deployment',
      'custom_sla',
      'dedicated_account_manager',
      'custom_training'
    ],
    price: null // custom pricing
  },
  byok: {
    maxApps: 20,
    aiGenerationsPerMonth: -1, // unlimited with own keys
    workflowExecutionsPerMonth: 500,
    maxTeamMembers: 1,
    customDomains: 3,
    features: [
      'all_templates',
      'custom_domains',
      'github_sync',
      'own_api_keys',
      'byok_pricing',
      'email_support',
      'private_deployments'
    ],
    price: 15
  }
};

/**
 * Feature descriptions for display
 */
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  basic_templates: 'Access to basic application templates',
  all_templates: 'Access to all premium templates',
  public_deployments: 'Deploy apps publicly',
  private_deployments: 'Deploy apps with private access',
  community_support: 'Community forum support',
  email_support: 'Email support with 24-hour response',
  priority_support: 'Priority email and chat support',
  dedicated_support: 'Dedicated support team',
  custom_domains: 'Use custom domains for deployments',
  github_sync: 'Sync projects with GitHub repositories',
  priority_generation: 'Faster code generation queue',
  white_label: 'Remove branding and add your own',
  team_collaboration: 'Collaborate with team members',
  n8n_workflows: 'Advanced workflow automation with n8n',
  sla: 'Service level agreement with uptime guarantee',
  sso: 'Single sign-on integration',
  custom_integrations: 'Custom API integrations',
  on_premise_deployment: 'Deploy on your own infrastructure',
  custom_ai_models: 'Use custom or fine-tuned AI models',
  own_api_keys: 'Bring your own AI provider API keys',
  byok_pricing: 'Pay only for platform, use your own AI credits',
  advanced_analytics: 'Detailed analytics and insights',
  basic_analytics: 'Basic usage analytics',
  advanced_security: 'Advanced security features and compliance',
  audit_logs: 'Comprehensive audit logging',
  api_access: 'Programmatic API access',
  custom_sla: 'Custom service level agreement',
  dedicated_account_manager: 'Dedicated account manager',
  custom_training: 'Custom training and onboarding'
};

/**
 * Get tier limits for a specific tier
 */
export function getTierLimits(tier: SubscriptionTier): TierFeatures {
  return TIER_LIMITS[tier];
}

/**
 * Check if a feature is available in a tier
 */
export function hasFeature(tier: SubscriptionTier, feature: string): boolean {
  const tierConfig = TIER_LIMITS[tier];

  // Check if feature is in the tier's feature list
  if (tierConfig.features.includes(feature)) {
    return true;
  }

  // Check for inherited features (e.g., all_pro_features includes all pro features)
  if (tierConfig.features.includes('all_pro_features')) {
    const proFeatures = TIER_LIMITS.pro.features;
    if (proFeatures.includes(feature)) {
      return true;
    }
  }

  if (tierConfig.features.includes('all_business_features')) {
    const businessFeatures = TIER_LIMITS.business.features;
    const proFeatures = TIER_LIMITS.pro.features;
    if (businessFeatures.includes(feature) || proFeatures.includes(feature)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all available features for a tier (including inherited)
 */
export function getAvailableFeatures(tier: SubscriptionTier): string[] {
  const tierConfig = TIER_LIMITS[tier];
  const features = new Set<string>(tierConfig.features);

  // Add inherited features
  if (tierConfig.features.includes('all_pro_features')) {
    TIER_LIMITS.pro.features.forEach(f => features.add(f));
  }

  if (tierConfig.features.includes('all_business_features')) {
    TIER_LIMITS.business.features.forEach(f => features.add(f));
    TIER_LIMITS.pro.features.forEach(f => features.add(f));
  }

  return Array.from(features);
}

/**
 * Check if limit is unlimited
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Tier upgrade/downgrade rules
 */
export const TIER_HIERARCHY: SubscriptionTier[] = [
  'free',
  'byok',
  'pro',
  'business',
  'enterprise'
];

/**
 * Check if upgrading from one tier to another
 */
export function isUpgrade(fromTier: SubscriptionTier, toTier: SubscriptionTier): boolean {
  const fromIndex = TIER_HIERARCHY.indexOf(fromTier);
  const toIndex = TIER_HIERARCHY.indexOf(toTier);
  return toIndex > fromIndex;
}

/**
 * Check if downgrading from one tier to another
 */
export function isDowngrade(fromTier: SubscriptionTier, toTier: SubscriptionTier): boolean {
  const fromIndex = TIER_HIERARCHY.indexOf(fromTier);
  const toIndex = TIER_HIERARCHY.indexOf(toTier);
  return toIndex < fromIndex;
}

/**
 * Grace period configuration
 */
export const GRACE_PERIOD_DAYS = 3;
export const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

/**
 * Billing cycle configuration
 */
export const BILLING_CYCLE_MONTHS = 1; // Monthly billing
export const BILLING_CYCLE_MS = 30 * 24 * 60 * 60 * 1000; // Approx 30 days
