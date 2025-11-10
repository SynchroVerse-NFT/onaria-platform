import { Context } from 'hono';
import { MonthlyUsageEnforcer, MonthlyUsage } from '../../../services/usage/MonthlyUsageEnforcer';
import { SubscriptionTier, MONTHLY_LIMITS } from '../../../services/rate-limit/config';
import { createObjectLogger } from '../../../logger';
import { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '../../../database/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

const logger = createObjectLogger('UsageAnalyticsController', 'UsageAnalyticsController');

interface TierLimits {
	aiGenerations: number;
	appsCreated: number;
	workflowExecutions: number;
}

interface UsagePercentages {
	ai: number;
	apps: number;
	workflows: number;
}

interface DailyUsage {
	date: string;
	aiGenerations: number;
	appsCreated: number;
	workflowExecutions: number;
}

interface UsageTrends {
	daily: DailyUsage[];
	weekly: DailyUsage[];
}

interface UsageProjection {
	endOfMonth: {
		aiGenerations: number;
		appsCreated: number;
		workflowExecutions: number;
	};
	overage: boolean;
}

interface CurrentPeriod {
	startDate: number;
	endDate: number;
	usage: MonthlyUsage;
	limits: TierLimits;
	percentages: UsagePercentages;
}

export async function getCurrentUsage(c: Context) {
	try {
		const userId = c.get('userId') as string;
		const env = c.env as Env;
		const db = c.get('db') as DrizzleD1Database<typeof schema>;

		// Get user's subscription
		const subscriptionResult = await db
			.select()
			.from(schema.subscriptions)
			.where(eq(schema.subscriptions.userId, userId))
			.limit(1);

		const tier: SubscriptionTier = subscriptionResult && subscriptionResult.length > 0
			? (subscriptionResult[0].planType as SubscriptionTier)
			: 'free';

		// Get current month usage
		const usage = await MonthlyUsageEnforcer.getMonthlyUsage(db, env, userId, tier);

		// Get tier limits
		const limits: TierLimits = {
			aiGenerations: MONTHLY_LIMITS.aiGenerations[tier],
			appsCreated: MONTHLY_LIMITS.apps[tier],
			workflowExecutions: MONTHLY_LIMITS.workflowExecutions[tier]
		};

		// Calculate percentages
		const percentages: UsagePercentages = {
			ai: usage.aiGenerations.percentage,
			apps: usage.apps.percentage,
			workflows: usage.workflows.percentage
		};

		// Get current period dates
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		const currentPeriod: CurrentPeriod = {
			startDate: monthStart.getTime(),
			endDate: monthEnd.getTime(),
			usage,
			limits,
			percentages
		};

		// Get trends
		const trends = await getUsageTrends(db, userId, monthStart);

		// Calculate projections
		const projections = calculateProjections(usage, limits, monthStart, now);

		return c.json({
			currentPeriod,
			trends,
			projections
		});
	} catch (error) {
		logger.error('Failed to get current usage', {
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return c.json(
			{ error: 'Failed to fetch usage data' },
			500
		);
	}
}

async function getUsageTrends(
	db: DrizzleD1Database<typeof schema>,
	userId: string,
	monthStart: Date
): Promise<UsageTrends> {
	try {
		// Get daily app creation counts for the current month
		const dailyApps = await db
			.select({
				date: sql<string>`DATE(${schema.apps.createdAt})`,
				count: sql<number>`count(*)`
			})
			.from(schema.apps)
			.where(
				and(
					eq(schema.apps.userId, userId),
					gte(schema.apps.createdAt, monthStart)
				)
			)
			.groupBy(sql`DATE(${schema.apps.createdAt})`)
			.orderBy(sql`DATE(${schema.apps.createdAt})`);

		// Build daily usage array
		const daily: DailyUsage[] = [];
		const now = new Date();
		const daysInMonth = Math.min(now.getDate(), 30);

		for (let i = 0; i < daysInMonth; i++) {
			const date = new Date(monthStart);
			date.setDate(date.getDate() + i);
			const dateStr = date.toISOString().split('T')[0];

			const appCount = dailyApps.find(d => d.date === dateStr)?.count || 0;

			daily.push({
				date: dateStr,
				aiGenerations: 0, // Would need to be tracked separately
				appsCreated: appCount,
				workflowExecutions: 0 // Would need to be tracked separately
			});
		}

		// Calculate weekly aggregates (last 4 weeks)
		const weekly: DailyUsage[] = [];
		const weeksToShow = 4;

		for (let i = 0; i < weeksToShow; i++) {
			const weekStart = new Date(now);
			weekStart.setDate(now.getDate() - (i + 1) * 7);
			const weekEnd = new Date(now);
			weekEnd.setDate(now.getDate() - i * 7);

			const weekApps = await db
				.select({
					count: sql<number>`count(*)`
				})
				.from(schema.apps)
				.where(
					and(
						eq(schema.apps.userId, userId),
						gte(schema.apps.createdAt, weekStart),
						sql`${schema.apps.createdAt} < ${weekEnd}`
					)
				);

			weekly.unshift({
				date: weekStart.toISOString().split('T')[0],
				aiGenerations: 0,
				appsCreated: weekApps[0]?.count || 0,
				workflowExecutions: 0
			});
		}

		return { daily, weekly };
	} catch (error) {
		logger.error('Failed to get usage trends', {
			userId,
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return { daily: [], weekly: [] };
	}
}

function calculateProjections(
	usage: MonthlyUsage,
	limits: TierLimits,
	monthStart: Date,
	now: Date
): UsageProjection {
	const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	const daysElapsed = now.getDate();
	const daysRemaining = daysInMonth - daysElapsed;

	// Calculate daily averages
	const dailyAiAvg = daysElapsed > 0 ? usage.aiGenerations.current / daysElapsed : 0;
	const dailyAppsAvg = daysElapsed > 0 ? usage.apps.current / daysElapsed : 0;
	const dailyWorkflowsAvg = daysElapsed > 0 ? usage.workflows.current / daysElapsed : 0;

	// Project to end of month
	const projectedAi = usage.aiGenerations.current + (dailyAiAvg * daysRemaining);
	const projectedApps = usage.apps.current + (dailyAppsAvg * daysRemaining);
	const projectedWorkflows = usage.workflows.current + (dailyWorkflowsAvg * daysRemaining);

	// Check if any projection exceeds limits
	const overage =
		(limits.aiGenerations !== -1 && projectedAi > limits.aiGenerations) ||
		(limits.appsCreated !== -1 && projectedApps > limits.appsCreated) ||
		(limits.workflowExecutions !== -1 && projectedWorkflows > limits.workflowExecutions);

	return {
		endOfMonth: {
			aiGenerations: Math.round(projectedAi),
			appsCreated: Math.round(projectedApps),
			workflowExecutions: Math.round(projectedWorkflows)
		},
		overage
	};
}

export async function resetUsage(c: Context) {
	try {
		const userId = c.get('userId') as string;
		const env = c.env as Env;

		// This would typically be an admin-only operation
		// or triggered automatically at the start of each billing cycle

		// Reset AI generations
		const aiKey = `monthly:ai:user:${userId}`;
		const aiStub = env.DORateLimitStore.getByName(aiKey);
		await aiStub.resetLimit(aiKey);

		// Reset workflow executions
		const workflowKey = `monthly:workflow:user:${userId}`;
		const workflowStub = env.DORateLimitStore.getByName(workflowKey);
		await workflowStub.resetLimit(workflowKey);

		logger.info('Reset user usage', { userId });

		return c.json({ success: true, message: 'Usage reset successfully' });
	} catch (error) {
		logger.error('Failed to reset usage', {
			error: error instanceof Error ? error.message : 'Unknown error'
		});

		return c.json(
			{ error: 'Failed to reset usage' },
			500
		);
	}
}
