import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WebhookSettings, WebhookLogs } from '@/components/workflows';
import { Zap, AlertCircle, ExternalLink, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { WebhookConfig, WebhookDelivery } from '@/types/workflow-types';

export default function WorkflowsSettingsPage() {
	// Mock data - in real app, this would come from API
	const [webhookConfig, setWebhookConfig] = React.useState<WebhookConfig>({
		id: '1',
		userId: 'user-1',
		url: 'https://api.example.com/webhooks/workflows',
		secret: 'wh_secret_1234567890abcdef',
		events: ['lead_capture', 'payment_success', 'error_alert'],
		active: true,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date(),
	});

	const [webhookDeliveries, setWebhookDeliveries] = React.useState<WebhookDelivery[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [showDeliveryLogs, setShowDeliveryLogs] = React.useState(false);

	// Mock workflow limits - would come from user subscription
	const workflowLimit = 10;
	const activeWorkflows = 3;
	const executionLimit = 1000;
	const executionsThisMonth = 234;

	const usagePercentage = (activeWorkflows / workflowLimit) * 100;
	const executionPercentage = (executionsThisMonth / executionLimit) * 100;

	const handleUpdateWebhookConfig = async (updates: Partial<WebhookConfig>) => {
		setLoading(true);
		try {
			// API call to update webhook config
			setWebhookConfig({ ...webhookConfig, ...updates });
			toast.success('Webhook settings updated');
		} catch (error) {
			toast.error('Failed to update webhook settings');
		} finally {
			setLoading(false);
		}
	};

	const handleRegenerateSecret = async (): Promise<string> => {
		setLoading(true);
		try {
			// API call to regenerate secret
			const newSecret = 'wh_secret_' + Math.random().toString(36).substring(2);
			setWebhookConfig({ ...webhookConfig, secret: newSecret });
			return newSecret;
		} catch (error) {
			toast.error('Failed to regenerate secret');
			throw error;
		} finally {
			setLoading(false);
		}
	};

	const handleTestWebhook = async () => {
		setLoading(true);
		try {
			// API call to test webhook
			await new Promise(resolve => setTimeout(resolve, 1000));
		} finally {
			setLoading(false);
		}
	};

	const handleViewDeliveryDetails = (deliveryId: string) => {
		toast.info('Viewing delivery details');
	};

	const handleRetryDelivery = async (deliveryId: string) => {
		// API call to retry delivery
		toast.success('Delivery retried');
	};

	const handleExportLogs = () => {
		// Generate and download CSV
		toast.success('Exporting webhook logs...');
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<div className="flex items-center gap-3 mb-2">
					<div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
						<Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
					</div>
					<h2 className="text-2xl font-bold text-text-primary">Workflow Settings</h2>
				</div>
				<p className="text-text-tertiary">
					Configure workflow automation limits, webhooks, and integrations
				</p>
			</div>

			{/* Workflow Limits */}
			<Card className="p-6 space-y-6">
				<div>
					<h3 className="text-lg font-semibold text-text-primary mb-1">Workflow Limits</h3>
					<p className="text-sm text-text-tertiary">
						Your current plan limits and usage
					</p>
				</div>

				<div className="space-y-6">
					{/* Active Workflows */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-text-primary">Active Workflows</p>
								<p className="text-xs text-text-tertiary">
									{activeWorkflows} of {workflowLimit} workflows active
								</p>
							</div>
							<Badge
								variant={usagePercentage > 80 ? 'destructive' : 'outline'}
								className={cn(
									usagePercentage > 80 && 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
								)}
							>
								{usagePercentage.toFixed(0)}% used
							</Badge>
						</div>
						<Progress value={usagePercentage} className="h-2" />
					</div>

					{/* Monthly Executions */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-text-primary">Monthly Executions</p>
								<p className="text-xs text-text-tertiary">
									{executionsThisMonth.toLocaleString()} of {executionLimit.toLocaleString()} executions this month
								</p>
							</div>
							<Badge
								variant={executionPercentage > 80 ? 'destructive' : 'outline'}
								className={cn(
									executionPercentage > 80 && 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'
								)}
							>
								{executionPercentage.toFixed(0)}% used
							</Badge>
						</div>
						<Progress value={executionPercentage} className="h-2" />
					</div>

					{/* Upgrade prompt */}
					{(usagePercentage > 80 || executionPercentage > 80) && (
						<div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
							<AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
							<div className="flex-1">
								<p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
									Approaching Limit
								</p>
								<p className="text-xs text-yellow-800 dark:text-yellow-300 mb-3">
									You're approaching your plan limits. Upgrade to increase your workflow capacity.
								</p>
								<Button size="sm" variant="outline" className="border-yellow-300 hover:bg-yellow-100 dark:border-yellow-700 dark:hover:bg-yellow-900">
									Upgrade Plan
								</Button>
							</div>
						</div>
					)}
				</div>
			</Card>

			<Separator />

			{/* Webhook Configuration */}
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold text-text-primary mb-1">Webhook Configuration</h3>
					<p className="text-sm text-text-tertiary">
						Configure webhooks to receive workflow event notifications
					</p>
				</div>

				<WebhookSettings
					config={webhookConfig}
					onUpdateConfig={handleUpdateWebhookConfig}
					onRegenerateSecret={handleRegenerateSecret}
					onTestWebhook={handleTestWebhook}
					loading={loading}
				/>
			</div>

			{/* Webhook Delivery Logs */}
			{showDeliveryLogs && (
				<>
					<Separator />
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-semibold text-text-primary mb-1">Delivery Logs</h3>
								<p className="text-sm text-text-tertiary">
									View recent webhook delivery attempts and their status
								</p>
							</div>
							<Button
								variant="outline"
								onClick={() => setShowDeliveryLogs(false)}
							>
								Hide Logs
							</Button>
						</div>

						<WebhookLogs
							deliveries={webhookDeliveries}
							loading={loading}
							onViewDetails={handleViewDeliveryDetails}
							onRetry={handleRetryDelivery}
							onExportCsv={handleExportLogs}
						/>
					</div>
				</>
			)}

			{!showDeliveryLogs && (
				<Button
					variant="outline"
					onClick={() => setShowDeliveryLogs(true)}
					className="w-full"
				>
					View Webhook Delivery Logs
				</Button>
			)}

			<Separator />

			{/* Security Best Practices */}
			<Card className="p-6 space-y-4">
				<div className="flex items-center gap-2">
					<Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
					<h3 className="text-lg font-semibold text-text-primary">Security Best Practices</h3>
				</div>
				<ul className="space-y-2 text-sm text-text-tertiary">
					<li className="flex items-start gap-2">
						<span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
						<span>Always verify webhook signatures using your secret key</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
						<span>Regenerate your webhook secret if you suspect it has been compromised</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
						<span>Use HTTPS endpoints to ensure secure transmission of webhook data</span>
					</li>
					<li className="flex items-start gap-2">
						<span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
						<span>Implement retry logic with exponential backoff for failed deliveries</span>
					</li>
				</ul>
				<Button variant="link" className="p-0 h-auto text-blue-600 dark:text-blue-400">
					<ExternalLink className="h-4 w-4 mr-1" />
					Read webhook security documentation
				</Button>
			</Card>

			{/* n8n Integration (Optional) */}
			<Card className="p-6 space-y-4">
				<div>
					<h3 className="text-lg font-semibold text-text-primary mb-1">n8n Integration</h3>
					<p className="text-sm text-text-tertiary">
						Connect to your self-hosted n8n instance for advanced workflow automation
					</p>
				</div>
				<div className="flex items-center gap-3">
					<Badge variant="outline">Optional</Badge>
					<span className="text-sm text-text-tertiary">Not configured</span>
				</div>
				<Button variant="outline">
					Configure n8n Instance
				</Button>
			</Card>
		</div>
	);
}
