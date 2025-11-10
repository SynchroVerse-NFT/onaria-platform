/**
 * Type definitions for Usage Controller responses
 */

import { UsageMetrics, TierLimits } from '../../../../src/api-types';

/**
 * Response data for getCurrentUsage
 */
export interface CurrentUsageData {
  usage: UsageMetrics;
  limits: TierLimits;
  percentUsed: {
    aiGenerations: number;
    apps: number;
    workflows: number;
  };
}

/**
 * Response data for getUsageHistory
 */
export interface UsageHistoryData {
  usage: Array<UsageMetrics & { date: string }>;
  total: UsageMetrics;
}

/**
 * Response data for exportUsage
 */
export interface UsageExportData {
  downloadUrl?: string;
  csvContent?: string;
  message: string;
}
