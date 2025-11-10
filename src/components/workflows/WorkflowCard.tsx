import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { Edit, Power, PowerOff, Trash2, FileText, MoreVertical, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Workflow } from '@/types/workflow-types';

interface WorkflowCardProps {
	workflow: Workflow;
	onClick?: () => void;
	onEdit?: () => void;
	onToggleStatus?: () => void;
	onDelete?: () => void;
	onViewLogs?: () => void;
	className?: string;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
	workflow,
	onClick,
	onEdit,
	onToggleStatus,
	onDelete,
	onViewLogs,
	className,
}) => {
	const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

	const successRate = workflow.executionCount > 0
		? Math.round((workflow.successCount / workflow.executionCount) * 100)
		: 0;

	const handleDeleteClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowDeleteDialog(true);
	};

	const handleDelete = () => {
		onDelete?.();
		setShowDeleteDialog(false);
	};

	const eventTypeLabels: Record<string, string> = {
		lead_capture: 'Lead Capture',
		payment_success: 'Payment Success',
		error_alert: 'Error Alert',
		new_app: 'New App',
		deployment: 'Deployment',
		custom: 'Custom Event',
	};

	return (
		<>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -20 }}
				transition={{ duration: 0.2 }}
				className={className}
			>
				<Card
					className={cn(
						'group relative overflow-hidden transition-all duration-200',
						'hover:shadow-lg hover:border-border-primary/60',
						'cursor-pointer',
						className
					)}
					onClick={onClick}
				>
					<div className="p-6">
						{/* Header */}
						<div className="flex items-start justify-between mb-4">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 mb-2">
									<div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
										<Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
									</div>
									<h3 className="text-lg font-semibold text-text-primary truncate">
										{workflow.name}
									</h3>
								</div>
								{workflow.description && (
									<p className="text-sm text-text-tertiary line-clamp-2 mb-3">
										{workflow.description}
									</p>
								)}
							</div>

							<DropdownMenu>
								<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
									<Button
										variant="ghost"
										size="sm"
										className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<MoreVertical className="h-4 w-4" />
										<span className="sr-only">Open menu</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
										<Edit className="mr-2 h-4 w-4" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleStatus?.(); }}>
										{workflow.status === 'active' ? (
											<>
												<PowerOff className="mr-2 h-4 w-4" />
												Deactivate
											</>
										) : (
											<>
												<Power className="mr-2 h-4 w-4" />
												Activate
											</>
										)}
									</DropdownMenuItem>
									<DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewLogs?.(); }}>
										<FileText className="mr-2 h-4 w-4" />
										View Logs
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={handleDeleteClick}
										className="text-red-600 dark:text-red-400"
									>
										<Trash2 className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>

						{/* Status and Trigger */}
						<div className="flex items-center gap-2 mb-4">
							<WorkflowStatusBadge status={workflow.status} />
							<span className="text-xs text-text-tertiary">
								Trigger: {eventTypeLabels[workflow.eventTrigger] || workflow.eventTrigger}
							</span>
						</div>

						{/* Stats */}
						<div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-primary">
							<div>
								<p className="text-xs text-text-tertiary mb-1">Executions</p>
								<p className="text-lg font-semibold text-text-primary">
									{workflow.executionCount}
								</p>
							</div>
							<div>
								<p className="text-xs text-text-tertiary mb-1">Success Rate</p>
								<p className={cn(
									'text-lg font-semibold',
									successRate >= 80 ? 'text-green-600 dark:text-green-400' :
									successRate >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
									'text-red-600 dark:text-red-400'
								)}>
									{successRate}%
								</p>
							</div>
							<div>
								<p className="text-xs text-text-tertiary mb-1">Last Run</p>
								<p className="text-sm font-medium text-text-primary">
									{workflow.lastRunAt
										? formatDistanceToNow(new Date(workflow.lastRunAt), { addSuffix: true })
										: 'Never'
									}
								</p>
							</div>
						</div>
					</div>
				</Card>
			</motion.div>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Workflow</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{workflow.name}"? This action cannot be undone
							and will stop all automated tasks for this workflow.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-red-600 hover:bg-red-700"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
