import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WorkflowExecution, ExecutionStatus } from '@/types/workflow-types';

interface ExecutionHistoryProps {
	executions: WorkflowExecution[];
	loading?: boolean;
	onViewDetails: (executionId: string) => void;
	onRetry: (executionId: string) => void;
	page?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	selectedWorkflow?: string;
	onWorkflowFilter?: (workflowId: string) => void;
	selectedStatus?: ExecutionStatus | 'all';
	onStatusFilter?: (status: ExecutionStatus | 'all') => void;
	className?: string;
}

export const ExecutionHistory: React.FC<ExecutionHistoryProps> = ({
	executions,
	loading = false,
	onViewDetails,
	onRetry,
	page = 1,
	totalPages = 1,
	onPageChange,
	selectedWorkflow = 'all',
	onWorkflowFilter,
	selectedStatus = 'all',
	onStatusFilter,
	className,
}) => {
	const formatDuration = (ms?: number) => {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	};

	return (
		<div className={cn('space-y-4', className)}>
			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				{onWorkflowFilter && (
					<Select value={selectedWorkflow} onValueChange={onWorkflowFilter}>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="All Workflows" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Workflows</SelectItem>
							{/* Unique workflows would be populated here */}
						</SelectContent>
					</Select>
				)}

				{onStatusFilter && (
					<Select value={selectedStatus} onValueChange={onStatusFilter}>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder="All Statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="success">Success</SelectItem>
							<SelectItem value="failed">Failed</SelectItem>
							<SelectItem value="running">Running</SelectItem>
							<SelectItem value="cancelled">Cancelled</SelectItem>
						</SelectContent>
					</Select>
				)}
			</div>

			{/* Table */}
			<div className="rounded-lg border border-border-primary overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Timestamp</TableHead>
							<TableHead>Workflow</TableHead>
							<TableHead>Event</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Duration</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8 text-text-tertiary">
									Loading executions...
								</TableCell>
							</TableRow>
						) : executions.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8 text-text-tertiary">
									No executions found
								</TableCell>
							</TableRow>
						) : (
							<AnimatePresence mode="popLayout">
								{executions.map((execution) => (
									<motion.tr
										key={execution.id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="border-b border-border-primary hover:bg-bg-2/50 transition-colors"
									>
										<TableCell>
											<div>
												<p className="text-sm font-medium">
													{format(new Date(execution.startedAt), 'MMM d, h:mm a')}
												</p>
												<p className="text-xs text-text-tertiary">
													{formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
												</p>
											</div>
										</TableCell>
										<TableCell className="font-medium">
											{execution.workflowName}
										</TableCell>
										<TableCell className="text-sm text-text-tertiary">
											{execution.eventType.split('_').map(word =>
												word.charAt(0).toUpperCase() + word.slice(1)
											).join(' ')}
										</TableCell>
										<TableCell>
											<WorkflowStatusBadge status={execution.status} />
										</TableCell>
										<TableCell className="text-sm">
											{formatDuration(execution.duration)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => onViewDetails(execution.id)}
												>
													<Eye className="h-4 w-4" />
													<span className="sr-only">View details</span>
												</Button>
												{execution.status === 'failed' && (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => onRetry(execution.id)}
													>
														<RefreshCw className="h-4 w-4" />
														<span className="sr-only">Retry</span>
													</Button>
												)}
											</div>
										</TableCell>
									</motion.tr>
								))}
							</AnimatePresence>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && onPageChange && (
				<div className="flex items-center justify-between">
					<p className="text-sm text-text-tertiary">
						Page {page} of {totalPages}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(page - 1)}
							disabled={page === 1}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(page + 1)}
							disabled={page === totalPages}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};
