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
import { Badge } from '@/components/ui/badge';
import { WorkflowStatusBadge } from './WorkflowStatusBadge';
import { Eye, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WebhookDelivery, WebhookDeliveryStatus } from '@/types/workflow-types';

interface WebhookLogsProps {
	deliveries: WebhookDelivery[];
	loading?: boolean;
	onViewDetails: (deliveryId: string) => void;
	onRetry: (deliveryId: string) => void;
	page?: number;
	totalPages?: number;
	onPageChange?: (page: number) => void;
	selectedStatus?: WebhookDeliveryStatus | 'all';
	onStatusFilter?: (status: WebhookDeliveryStatus | 'all') => void;
	onExportCsv?: () => void;
	className?: string;
}

export const WebhookLogs: React.FC<WebhookLogsProps> = ({
	deliveries,
	loading = false,
	onViewDetails,
	onRetry,
	page = 1,
	totalPages = 1,
	onPageChange,
	selectedStatus = 'all',
	onStatusFilter,
	onExportCsv,
	className,
}) => {
	const formatResponseTime = (ms?: number) => {
		if (!ms) return '-';
		if (ms < 1000) return `${ms}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	};

	const getStatusBadge = (status: WebhookDeliveryStatus) => {
		return (
			<Badge
				variant={status === 'success' ? 'default' : 'destructive'}
				className={cn(
					'font-medium',
					status === 'success' && 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
				)}
			>
				{status}
			</Badge>
		);
	};

	const handleExport = () => {
		if (onExportCsv) {
			onExportCsv();
			toast.success('CSV export started');
		}
	};

	return (
		<div className={cn('space-y-4', className)}>
			{/* Filters */}
			<div className="flex flex-col sm:flex-row justify-between gap-4">
				<div className="flex gap-4">
					{onStatusFilter && (
						<Select value={selectedStatus} onValueChange={onStatusFilter}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="success">Success</SelectItem>
								<SelectItem value="failed">Failed</SelectItem>
							</SelectContent>
						</Select>
					)}
				</div>

				{onExportCsv && (
					<Button variant="outline" onClick={handleExport} disabled={loading || deliveries.length === 0}>
						<Download className="h-4 w-4 mr-2" />
						Export CSV
					</Button>
				)}
			</div>

			{/* Table */}
			<div className="rounded-lg border border-border-primary overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Timestamp</TableHead>
							<TableHead>Event</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Response Time</TableHead>
							<TableHead>Retries</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8 text-text-tertiary">
									Loading deliveries...
								</TableCell>
							</TableRow>
						) : deliveries.length === 0 ? (
							<TableRow>
								<TableCell colSpan={6} className="text-center py-8 text-text-tertiary">
									No webhook deliveries found
								</TableCell>
							</TableRow>
						) : (
							<AnimatePresence mode="popLayout">
								{deliveries.map((delivery) => (
									<motion.tr
										key={delivery.id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="border-b border-border-primary hover:bg-bg-2/50 transition-colors"
									>
										<TableCell>
											<div>
												<p className="text-sm font-medium">
													{format(new Date(delivery.sentAt), 'MMM d, h:mm a')}
												</p>
												<p className="text-xs text-text-tertiary">
													{formatDistanceToNow(new Date(delivery.sentAt), { addSuffix: true })}
												</p>
											</div>
										</TableCell>
										<TableCell className="text-sm">
											{delivery.eventType.split('_').map(word =>
												word.charAt(0).toUpperCase() + word.slice(1)
											).join(' ')}
										</TableCell>
										<TableCell>
											{getStatusBadge(delivery.status)}
											{delivery.response && (
												<p className="text-xs text-text-tertiary mt-1">
													HTTP {delivery.response.statusCode}
												</p>
											)}
										</TableCell>
										<TableCell className="text-sm">
											{formatResponseTime(delivery.responseTime)}
										</TableCell>
										<TableCell>
											{delivery.retryCount > 0 ? (
												<Badge variant="outline" className="text-xs">
													{delivery.retryCount} {delivery.retryCount === 1 ? 'retry' : 'retries'}
												</Badge>
											) : (
												<span className="text-xs text-text-tertiary">-</span>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex justify-end gap-2">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => onViewDetails(delivery.id)}
												>
													<Eye className="h-4 w-4" />
													<span className="sr-only">View details</span>
												</Button>
												{delivery.status === 'failed' && (
													<Button
														size="sm"
														variant="ghost"
														onClick={() => onRetry(delivery.id)}
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
