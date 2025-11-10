import React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import {
	CheckCircle,
	XCircle,
	Clock,
	ExternalLink,
	Copy,
	ChevronDown,
	ChevronRight,
	RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { WorkflowExecution } from '@/types/workflow-types';

interface ExecutionDetailsModalProps {
	execution: WorkflowExecution | null;
	open: boolean;
	onClose: () => void;
	onRetry?: (executionId: string) => void;
}

export const ExecutionDetailsModal: React.FC<ExecutionDetailsModalProps> = ({
	execution,
	open,
	onClose,
	onRetry,
}) => {
	const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
		new Set(['trigger', 'steps'])
	);

	if (!execution) return null;

	const toggleSection = (section: string) => {
		const newExpanded = new Set(expandedSections);
		if (newExpanded.has(section)) {
			newExpanded.delete(section);
		} else {
			newExpanded.add(section);
		}
		setExpandedSections(newExpanded);
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		toast.success('Copied to clipboard');
	};

	const formatDuration = (ms?: number) => {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
		return `${(ms / 60000).toFixed(2)}m`;
	};

	const handleViewInN8n = () => {
		if (execution.n8nExecutionId) {
			window.open(`/n8n/execution/${execution.n8nExecutionId}`, '_blank');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent className="max-w-3xl max-h-[90vh]">
				<DialogHeader>
					<div className="flex items-center justify-between mb-2">
						<div>
							<DialogTitle>{execution.workflowName}</DialogTitle>
							<DialogDescription>
								Execution {execution.id.slice(0, 8)}
							</DialogDescription>
						</div>
						<WorkflowStatusBadge status={execution.status} />
					</div>
				</DialogHeader>

				<ScrollArea className="max-h-[calc(90vh-200px)]">
					<div className="space-y-6 py-4 pr-4">
						{/* Summary */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<p className="text-sm text-text-tertiary">Started At</p>
								<p className="text-sm font-medium mt-1">
									{format(new Date(execution.startedAt), 'MMM d, yyyy h:mm:ss a')}
								</p>
							</div>
							<div>
								<p className="text-sm text-text-tertiary">Duration</p>
								<p className="text-sm font-medium mt-1">
									{formatDuration(execution.duration)}
								</p>
							</div>
							{execution.completedAt && (
								<div>
									<p className="text-sm text-text-tertiary">Completed At</p>
									<p className="text-sm font-medium mt-1">
										{format(new Date(execution.completedAt), 'MMM d, yyyy h:mm:ss a')}
									</p>
								</div>
							)}
							<div>
								<p className="text-sm text-text-tertiary">Event Type</p>
								<p className="text-sm font-medium mt-1">
									{execution.eventType.split('_').map(word =>
										word.charAt(0).toUpperCase() + word.slice(1)
									).join(' ')}
								</p>
							</div>
						</div>

						<Separator />

						{/* Trigger Data */}
						<div>
							<button
								onClick={() => toggleSection('trigger')}
								className="flex items-center gap-2 w-full text-left font-semibold text-text-primary hover:text-text-primary/80 transition-colors"
							>
								{expandedSections.has('trigger') ? (
									<ChevronDown className="h-4 w-4" />
								) : (
									<ChevronRight className="h-4 w-4" />
								)}
								Trigger Data
							</button>
							{expandedSections.has('trigger') && (
								<div className="mt-3 relative">
									<Button
										size="sm"
										variant="ghost"
										className="absolute top-2 right-2 z-10"
										onClick={() => copyToClipboard(JSON.stringify(execution.triggerData, null, 2))}
									>
										<Copy className="h-3 w-3" />
									</Button>
									<pre className="p-4 rounded-lg bg-bg-3 dark:bg-bg-4 text-xs overflow-x-auto">
										{JSON.stringify(execution.triggerData, null, 2)}
									</pre>
								</div>
							)}
						</div>

						<Separator />

						{/* Execution Steps */}
						<div>
							<button
								onClick={() => toggleSection('steps')}
								className="flex items-center gap-2 w-full text-left font-semibold text-text-primary hover:text-text-primary/80 transition-colors"
							>
								{expandedSections.has('steps') ? (
									<ChevronDown className="h-4 w-4" />
								) : (
									<ChevronRight className="h-4 w-4" />
								)}
								Execution Timeline ({execution.steps.length} steps)
							</button>
							{expandedSections.has('steps') && (
								<div className="mt-4 space-y-3">
									{execution.steps.map((step, index) => (
										<div
											key={step.id}
											className={cn(
												'p-4 rounded-lg border',
												step.status === 'success' && 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30',
												step.status === 'failed' && 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30',
												step.status === 'running' && 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30',
												!step.status && 'border-border-primary bg-bg-2'
											)}
										>
											<div className="flex items-start justify-between">
												<div className="flex items-start gap-3 flex-1">
													<div className="flex items-center justify-center w-6 h-6 rounded-full bg-bg-3 dark:bg-bg-4 text-xs font-medium">
														{index + 1}
													</div>
													<div className="flex-1">
														<div className="flex items-center gap-2 mb-1">
															<p className="font-medium">{step.name}</p>
															{step.status === 'success' && (
																<CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
															)}
															{step.status === 'failed' && (
																<XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
															)}
															{step.status === 'running' && (
																<Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
															)}
														</div>
														<div className="text-xs text-text-tertiary space-y-1">
															<p>Duration: {formatDuration(step.duration)}</p>
															{step.completedAt && (
																<p>Completed: {format(new Date(step.completedAt), 'h:mm:ss a')}</p>
															)}
														</div>
														{step.error && (
															<div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 text-xs">
																{step.error}
															</div>
														)}
													</div>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Error Message */}
						{execution.error && (
							<>
								<Separator />
								<div>
									<h4 className="font-semibold text-text-primary mb-3">Error</h4>
									<div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-sm">
										{execution.error}
									</div>
								</div>
							</>
						)}

						{/* Logs */}
						{execution.logs && execution.logs.length > 0 && (
							<>
								<Separator />
								<div>
									<button
										onClick={() => toggleSection('logs')}
										className="flex items-center gap-2 w-full text-left font-semibold text-text-primary hover:text-text-primary/80 transition-colors"
									>
										{expandedSections.has('logs') ? (
											<ChevronDown className="h-4 w-4" />
										) : (
											<ChevronRight className="h-4 w-4" />
										)}
										Logs ({execution.logs.length})
									</button>
									{expandedSections.has('logs') && (
										<div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
											{execution.logs.map((log, index) => (
												<div
													key={index}
													className="p-2 rounded text-xs font-mono bg-bg-3 dark:bg-bg-4"
												>
													<div className="flex items-start gap-2">
														<Badge
															variant={
																log.level === 'error' ? 'destructive' :
																log.level === 'warn' ? 'outline' :
																'secondary'
															}
															className="text-[10px]"
														>
															{log.level}
														</Badge>
														<span className="text-text-tertiary">
															{format(new Date(log.timestamp), 'HH:mm:ss')}
														</span>
														<span className="flex-1">{log.message}</span>
													</div>
												</div>
											))}
										</div>
									)}
								</div>
							</>
						)}
					</div>
				</ScrollArea>

				{/* Actions */}
				<div className="flex gap-3 pt-4 border-t border-border-primary">
					<Button variant="outline" onClick={onClose} className="flex-1">
						Close
					</Button>
					{execution.n8nExecutionId && (
						<Button variant="outline" onClick={handleViewInN8n}>
							<ExternalLink className="h-4 w-4 mr-2" />
							View in n8n
						</Button>
					)}
					{execution.status === 'failed' && onRetry && (
						<Button onClick={() => onRetry(execution.id)}>
							<RefreshCw className="h-4 w-4 mr-2" />
							Retry
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
};
