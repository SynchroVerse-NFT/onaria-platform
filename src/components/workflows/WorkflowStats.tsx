import React from 'react';
import { Card } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Activity, CheckCircle, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStats, DateRange } from '@/types/workflow-types';

interface WorkflowStatsProps {
	stats: WorkflowStats;
	dateRange: DateRange;
	onDateRangeChange: (range: DateRange) => void;
	loading?: boolean;
	className?: string;
}

const dateRangeOptions = [
	{ value: '7d' as DateRange, label: 'Last 7 days' },
	{ value: '30d' as DateRange, label: 'Last 30 days' },
	{ value: '90d' as DateRange, label: 'Last 90 days' },
	{ value: 'all' as DateRange, label: 'All time' },
];

export const WorkflowStats: React.FC<WorkflowStatsProps> = ({
	stats,
	dateRange,
	onDateRangeChange,
	loading = false,
	className,
}) => {
	return (
		<div className={cn('space-y-6', className)}>
			{/* Date Range Selector */}
			<div className="flex justify-between items-center">
				<h3 className="text-lg font-semibold text-text-primary">Statistics</h3>
				<Select value={dateRange} onValueChange={onDateRangeChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{dateRangeOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Statistics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-text-tertiary">Total Executions</p>
						<Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
					</div>
					<p className="text-3xl font-bold text-text-primary">
						{loading ? '-' : stats.totalExecutions.toLocaleString()}
					</p>
				</Card>

				<Card className="p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-text-tertiary">Success Rate</p>
						<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
					</div>
					<p className="text-3xl font-bold text-text-primary">
						{loading ? '-' : `${stats.successRate.toFixed(1)}%`}
					</p>
				</Card>

				<Card className="p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-text-tertiary">Avg Duration</p>
						<Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
					</div>
					<p className="text-3xl font-bold text-text-primary">
						{loading ? '-' : `${(stats.averageDuration / 1000).toFixed(2)}s`}
					</p>
				</Card>

				<Card className="p-6">
					<div className="flex items-center justify-between mb-2">
						<p className="text-sm text-text-tertiary">Active Workflows</p>
						<Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
					</div>
					<p className="text-3xl font-bold text-text-primary">
						{loading ? '-' : stats.activeWorkflows}
					</p>
				</Card>
			</div>

			{/* Executions Over Time Chart */}
			<Card className="p-6">
				<h4 className="text-sm font-semibold text-text-primary mb-4">
					Executions Over Time
				</h4>
				{loading ? (
					<div className="h-[200px] flex items-center justify-center text-text-tertiary">
						Loading...
					</div>
				) : stats.executionsByDay.length === 0 ? (
					<div className="h-[200px] flex items-center justify-center text-text-tertiary">
						No execution data available
					</div>
				) : (
					<div className="h-[200px] flex items-end justify-between gap-2">
						{stats.executionsByDay.map((day) => {
							const maxCount = Math.max(...stats.executionsByDay.map(d => d.count));
							const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
							const successHeight = day.count > 0 ? (day.successCount / day.count) * height : 0;

							return (
								<div
									key={day.date}
									className="flex-1 flex flex-col items-center gap-2 group"
								>
									<div className="relative w-full h-full flex flex-col justify-end">
										<div
											className="w-full bg-red-200 dark:bg-red-900 rounded-t transition-all"
											style={{ height: `${height}%` }}
										/>
										<div
											className="absolute bottom-0 w-full bg-green-500 dark:bg-green-600 rounded-t transition-all"
											style={{ height: `${successHeight}%` }}
										/>
									</div>
									<span className="text-[10px] text-text-tertiary rotate-45 origin-left whitespace-nowrap">
										{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
									</span>
									<div className="hidden group-hover:block absolute bg-bg-4 border border-border-primary rounded p-2 text-xs z-10 -translate-y-full -mt-2">
										<p className="font-medium">{day.count} executions</p>
										<p className="text-green-600 dark:text-green-400">{day.successCount} success</p>
										<p className="text-red-600 dark:text-red-400">{day.failureCount} failed</p>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</Card>

			{/* Top Workflows */}
			<Card className="p-6">
				<h4 className="text-sm font-semibold text-text-primary mb-4">
					Most Used Workflows
				</h4>
				{loading ? (
					<div className="flex items-center justify-center py-8 text-text-tertiary">
						Loading...
					</div>
				) : stats.topWorkflows.length === 0 ? (
					<div className="flex items-center justify-center py-8 text-text-tertiary">
						No workflow data available
					</div>
				) : (
					<div className="space-y-3">
						{stats.topWorkflows.map((workflow, index) => {
							const maxCount = stats.topWorkflows[0]?.executionCount || 1;
							const percentage = (workflow.executionCount / maxCount) * 100;

							return (
								<div key={workflow.workflowId} className="space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium text-text-primary truncate flex-1">
											{index + 1}. {workflow.workflowName}
										</span>
										<span className="text-text-tertiary ml-2">
											{workflow.executionCount} runs
										</span>
									</div>
									<div className="h-2 bg-bg-3 rounded-full overflow-hidden">
										<div
											className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
											style={{ width: `${percentage}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</Card>
		</div>
	);
};
