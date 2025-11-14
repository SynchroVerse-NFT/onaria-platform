import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle, Wrench } from 'lucide-react';

export interface AutoFixStatus {
	status: 'idle' | 'processing' | 'fixing' | 'verifying' | 'completed' | 'failed';
	queueSize: number;
	activeFixesCount: number;
	totalFixed: number;
	totalFailed: number;
	currentError?: {
		type: string;
		severity: string;
		message: string;
		file?: string;
		line?: number;
	};
}

interface AutoFixStatusProps {
	status: AutoFixStatus;
}

export function AutoFixStatusIndicator({ status }: AutoFixStatusProps) {
	const [isVisible, setIsVisible] = useState(false);

	// Show indicator when auto-fix is active or has recent activity
	useEffect(() => {
		if (status.status !== 'idle' || status.queueSize > 0 || status.activeFixesCount > 0) {
			setIsVisible(true);
		} else {
			// Hide after completion with delay
			const timer = setTimeout(() => setIsVisible(false), 5000);
			return () => clearTimeout(timer);
		}
	}, [status.status, status.queueSize, status.activeFixesCount]);

	if (!isVisible) return null;

	const getStatusColor = () => {
		switch (status.status) {
			case 'processing':
			case 'fixing':
			case 'verifying':
				return 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400';
			case 'completed':
				return 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400';
			case 'failed':
				return 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400';
			default:
				return 'bg-gray-500/10 border-gray-500/30 text-gray-600 dark:text-gray-400';
		}
	};

	const getStatusIcon = () => {
		switch (status.status) {
			case 'processing':
			case 'fixing':
			case 'verifying':
				return <Loader2 className="w-4 h-4 animate-spin" />;
			case 'completed':
				return <CheckCircle2 className="w-4 h-4" />;
			case 'failed':
				return <XCircle className="w-4 h-4" />;
			default:
				return <Wrench className="w-4 h-4" />;
		}
	};

	const getStatusText = () => {
		switch (status.status) {
			case 'processing':
				return 'Processing errors...';
			case 'fixing':
				return status.currentError
					? `Fixing ${status.currentError.type} error...`
					: 'Fixing error...';
			case 'verifying':
				return 'Verifying fix...';
			case 'completed':
				return 'Auto-fix completed';
			case 'failed':
				return 'Auto-fix failed';
			default:
				return 'Auto-fix idle';
		}
	};

	return (
		<div
			className={`
				fixed bottom-24 right-6 z-40
				p-3 rounded-lg border backdrop-blur-xl
				shadow-lg transition-all duration-300
				max-w-xs
				${getStatusColor()}
			`}
		>
			<div className="flex items-start gap-3">
				<div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium mb-1">{getStatusText()}</div>

					<div className="flex items-center gap-4 text-xs opacity-75">
						{status.activeFixesCount > 0 && (
							<span className="flex items-center gap-1">
								<Loader2 className="w-3 h-3 animate-spin" />
								{status.activeFixesCount} active
							</span>
						)}
						{status.queueSize > 0 && (
							<span className="flex items-center gap-1">
								<AlertCircle className="w-3 h-3" />
								{status.queueSize} queued
							</span>
						)}
						{status.totalFixed > 0 && (
							<span className="flex items-center gap-1">
								<CheckCircle2 className="w-3 h-3" />
								{status.totalFixed} fixed
							</span>
						)}
						{status.totalFailed > 0 && (
							<span className="flex items-center gap-1">
								<XCircle className="w-3 h-3" />
								{status.totalFailed} failed
							</span>
						)}
					</div>

					{status.currentError && (
						<div className="mt-2 pt-2 border-t border-current/10">
							<div className="text-xs opacity-75">
								{status.currentError.file && (
									<div className="truncate">
										{status.currentError.file}
										{status.currentError.line && `:${status.currentError.line}`}
									</div>
								)}
								<div className="truncate mt-0.5">
									{status.currentError.message.slice(0, 80)}
									{status.currentError.message.length > 80 && '...'}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
