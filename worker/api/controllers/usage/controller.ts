/**
 * Usage Controller
 * Handles API requests for LLM usage and cost tracking
 */

import { BaseController } from '../baseController';
import { ControllerResponse, ApiResponse } from '../types';
import type { RouteContext } from '../../types/route-context';
import { LLMUsageService } from '../../../database/services/LLMUsageService';
import { UsageStatsData, TotalCostData, RecentUsageData } from './types';
import { createLogger } from '../../../logger';

export class UsageController extends BaseController {
    static logger = createLogger('UsageController');

    /**
     * Get user's LLM usage statistics
     * GET /api/usage/stats
     * Query params: startDate?, endDate?, period? (7d, 30d, 90d, all)
     */
    static async getUserUsageStats(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<UsageStatsData>>> {
        try {
            const user = context.user!;
            const usageService = new LLMUsageService(env);

            // Parse query parameters
            const url = new URL(request.url);
            const startDateParam = url.searchParams.get('startDate');
            const endDateParam = url.searchParams.get('endDate');
            const period = url.searchParams.get('period') || '30d';

            let startDate: Date | undefined;
            let endDate: Date | undefined;

            // If specific dates provided, use them
            if (startDateParam) {
                startDate = new Date(startDateParam);
            } else {
                // Otherwise use period
                const now = new Date();
                endDate = now;

                switch (period) {
                    case '7d':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    case '90d':
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                    case 'all':
                        startDate = undefined;
                        break;
                    default:
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }
            }

            if (endDateParam) {
                endDate = new Date(endDateParam);
            }

            const stats = await usageService.getUserUsageStats(user.id, startDate, endDate);

            return UsageController.createSuccessResponse({ stats });
        } catch (error) {
            this.logger.error('Failed to get user usage stats', { error, userId: context.user?.id });
            return UsageController.createErrorResponse<UsageStatsData>('Failed to retrieve usage statistics', 500);
        }
    }

    /**
     * Get usage statistics for a specific app
     * GET /api/usage/app/:appId
     */
    static async getAppUsageStats(_request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<UsageStatsData>>> {
        try {
            const appId = context.pathParams.appId;
            if (!appId) {
                return UsageController.createErrorResponse<UsageStatsData>('App ID is required', 400);
            }

            const usageService = new LLMUsageService(env);
            const stats = await usageService.getAppUsageStats(appId);

            return UsageController.createSuccessResponse({ stats });
        } catch (error) {
            this.logger.error('Failed to get app usage stats', { error, userId: context.user?.id });
            return UsageController.createErrorResponse<UsageStatsData>('Failed to retrieve app usage statistics', 500);
        }
    }

    /**
     * Get user's total cost
     * GET /api/usage/total-cost
     * Query params: startDate?, endDate?, period? (7d, 30d, 90d, all)
     */
    static async getTotalCost(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<TotalCostData>>> {
        try {
            const user = context.user!;
            const usageService = new LLMUsageService(env);

            // Parse query parameters (same logic as getUserUsageStats)
            const url = new URL(request.url);
            const startDateParam = url.searchParams.get('startDate');
            const endDateParam = url.searchParams.get('endDate');
            const period = url.searchParams.get('period') || '30d';

            let startDate: Date | undefined;
            let endDate: Date | undefined;

            if (startDateParam) {
                startDate = new Date(startDateParam);
            } else {
                const now = new Date();
                endDate = now;

                switch (period) {
                    case '7d':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30d':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    case '90d':
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                    case 'all':
                        startDate = undefined;
                        break;
                    default:
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }
            }

            if (endDateParam) {
                endDate = new Date(endDateParam);
            }

            const totalCost = await usageService.getUserTotalCost(user.id, startDate, endDate);

            return UsageController.createSuccessResponse({ totalCost });
        } catch (error) {
            this.logger.error('Failed to get total cost', { error, userId: context.user?.id });
            return UsageController.createErrorResponse<TotalCostData>('Failed to retrieve total cost', 500);
        }
    }

    /**
     * Get recent usage records
     * GET /api/usage/recent
     * Query params: limit? (default 100, max 1000)
     */
    static async getRecentUsage(request: Request, env: Env, _ctx: ExecutionContext, context: RouteContext): Promise<ControllerResponse<ApiResponse<RecentUsageData>>> {
        try {
            const user = context.user!;
            const url = new URL(request.url);
            const limitParam = url.searchParams.get('limit');
            const limit = limitParam ? Math.min(parseInt(limitParam, 10), 1000) : 100;

            const usageService = new LLMUsageService(env);
            const records = await usageService.getUserRecentUsage(user.id, limit);

            return UsageController.createSuccessResponse({ records });
        } catch (error) {
            this.logger.error('Failed to get recent usage', { error, userId: context.user?.id });
            return UsageController.createErrorResponse<RecentUsageData>('Failed to retrieve recent usage', 500);
        }
    }
}
