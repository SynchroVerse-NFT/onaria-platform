import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Loader2, Clock, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStatus, ExecutionStatus } from '@/types/workflow-types';

interface WorkflowStatusBadgeProps {
	status: WorkflowStatus | ExecutionStatus;
	className?: string;
	showIcon?: boolean;
}

const statusConfig = {
	// Workflow statuses
	active: {
		label: 'Active',
		icon: CheckCircle,
		className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
	},
	inactive: {
		label: 'Inactive',
		icon: AlertCircle,
		className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800',
	},
	error: {
		label: 'Error',
		icon: XCircle,
		className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
	},
	// Execution statuses
	success: {
		label: 'Success',
		icon: CheckCircle,
		className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
	},
	failed: {
		label: 'Failed',
		icon: XCircle,
		className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
	},
	running: {
		label: 'Running',
		icon: Loader2,
		className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
		animated: true,
	},
	cancelled: {
		label: 'Cancelled',
		icon: Ban,
		className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-400 dark:border-gray-800',
	},
};

export const WorkflowStatusBadge: React.FC<WorkflowStatusBadgeProps> = ({
	status,
	className,
	showIcon = true,
}) => {
	const config = statusConfig[status];
	const Icon = config.icon;

	return (
		<Badge
			variant="outline"
			className={cn(
				'flex items-center gap-1.5 font-medium',
				config.className,
				className
			)}
		>
			{showIcon && (
				<Icon
					className={cn(
						'h-3 w-3',
						config.animated && 'animate-spin'
					)}
				/>
			)}
			<span>{config.label}</span>
		</Badge>
	);
};
