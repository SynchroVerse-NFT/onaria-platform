import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	WorkflowCard,
	TemplateGallery,
	TemplatePreviewModal,
	ServiceConnectionModal,
	WorkflowConfigModal,
	ExecutionHistory,
	ExecutionDetailsModal,
	EmptyStates,
} from '@/components/workflows';
import { Zap, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import type {
	Workflow,
	WorkflowTemplate,
	WorkflowExecution,
	WorkflowStatus,
	ServiceConnection,
	ServiceType,
} from '@/types/workflow-types';

export default function WorkflowsPage() {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = React.useState('my-workflows');
	const [searchQuery, setSearchQuery] = React.useState('');
	const [statusFilter, setStatusFilter] = React.useState<WorkflowStatus | 'all'>('all');
	const [sortBy, setSortBy] = React.useState<'recent' | 'most_used' | 'success_rate'>('recent');

	// Modal states
	const [selectedTemplate, setSelectedTemplate] = React.useState<WorkflowTemplate | null>(null);
	const [showPreviewModal, setShowPreviewModal] = React.useState(false);
	const [showConfigModal, setShowConfigModal] = React.useState(false);
	const [showServiceModal, setShowServiceModal] = React.useState(false);
	const [selectedService, setSelectedService] = React.useState<ServiceType | null>(null);
	const [showExecutionDetails, setShowExecutionDetails] = React.useState(false);
	const [selectedExecution, setSelectedExecution] = React.useState<WorkflowExecution | null>(null);

	// Mock data - in real app, this would come from API
	const [workflows, setWorkflows] = React.useState<Workflow[]>([]);
	const [executions, setExecutions] = React.useState<WorkflowExecution[]>([]);
	const [serviceConnections, setServiceConnections] = React.useState<ServiceConnection[]>([]);
	const [loading, setLoading] = React.useState(false);

	const filteredWorkflows = React.useMemo(() => {
		return workflows.filter(workflow => {
			const matchesSearch = searchQuery === '' ||
				workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;

			return matchesSearch && matchesStatus;
		});
	}, [workflows, searchQuery, statusFilter]);

	const handleUseTemplate = (templateId: string) => {
		// Find template and show config modal
		// In real app, fetch template from API
		toast.info('Opening workflow configuration...');
		setShowConfigModal(true);
	};

	const handlePreviewTemplate = (template: WorkflowTemplate) => {
		setSelectedTemplate(template);
		setShowPreviewModal(true);
	};

	const handleConnectService = (serviceType: ServiceType) => {
		setSelectedService(serviceType);
		setShowServiceModal(true);
	};

	const handleServiceConnect = async (serviceType: ServiceType, config: Record<string, string>) => {
		// API call to connect service
		toast.success(`${serviceType} connected successfully`);
	};

	const handleActivateWorkflow = async (config: {
		name: string;
		description?: string;
		settings: Record<string, unknown>;
	}) => {
		// API call to create workflow
		toast.success('Workflow activated successfully');
		setShowConfigModal(false);
	};

	const handleToggleWorkflowStatus = async (workflowId: string, newStatus: WorkflowStatus) => {
		// API call to update workflow status
		setWorkflows(workflows.map(w =>
			w.id === workflowId ? { ...w, status: newStatus } : w
		));
		toast.success(`Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
	};

	const handleDeleteWorkflow = async (workflowId: string) => {
		// API call to delete workflow
		setWorkflows(workflows.filter(w => w.id !== workflowId));
		toast.success('Workflow deleted');
	};

	const handleViewExecution = (executionId: string) => {
		const execution = executions.find(e => e.id === executionId);
		if (execution) {
			setSelectedExecution(execution);
			setShowExecutionDetails(true);
		}
	};

	const handleRetryExecution = async (executionId: string) => {
		// API call to retry execution
		toast.success('Execution retried');
	};

	return (
		<div className="container mx-auto p-6 max-w-7xl">
			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div>
					<div className="flex items-center gap-3 mb-2">
						<div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
							<Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
						</div>
						<h1 className="text-3xl font-bold text-text-primary">Workflows</h1>
					</div>
					<p className="text-text-tertiary">
						Automate your development workflow with powerful integrations
					</p>
				</div>
				<Button
					onClick={() => setActiveTab('templates')}
					className="gap-2"
				>
					<Plus className="h-4 w-4" />
					Create Workflow
				</Button>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
				<TabsList>
					<TabsTrigger value="my-workflows">My Workflows</TabsTrigger>
					<TabsTrigger value="templates">Templates</TabsTrigger>
					<TabsTrigger value="history">Execution History</TabsTrigger>
				</TabsList>

				{/* My Workflows Tab */}
				<TabsContent value="my-workflows" className="space-y-6">
					{/* Filters */}
					<div className="flex flex-col sm:flex-row gap-4">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
							<Input
								placeholder="Search workflows..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-9"
							/>
						</div>
						<Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as WorkflowStatus | 'all')}>
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="All Statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="inactive">Inactive</SelectItem>
								<SelectItem value="error">Error</SelectItem>
							</SelectContent>
						</Select>
						<Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
							<SelectTrigger className="w-[150px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="recent">Most Recent</SelectItem>
								<SelectItem value="most_used">Most Used</SelectItem>
								<SelectItem value="success_rate">Success Rate</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Workflows Grid */}
					{filteredWorkflows.length === 0 ? (
						<EmptyStates
							type="no-workflows"
							onAction={() => setActiveTab('templates')}
						/>
					) : (
						<motion.div
							className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
						>
							{filteredWorkflows.map((workflow) => (
								<WorkflowCard
									key={workflow.id}
									workflow={workflow}
									onClick={() => {/* Navigate to workflow details */}}
									onEdit={() => {/* Open edit modal */}}
									onToggleStatus={() => handleToggleWorkflowStatus(
										workflow.id,
										workflow.status === 'active' ? 'inactive' : 'active'
									)}
									onDelete={() => handleDeleteWorkflow(workflow.id)}
									onViewLogs={() => {
										setActiveTab('history');
									}}
								/>
							))}
						</motion.div>
					)}
				</TabsContent>

				{/* Templates Tab */}
				<TabsContent value="templates">
					<TemplateGallery
						onUseTemplate={handleUseTemplate}
						onPreview={handlePreviewTemplate}
					/>
				</TabsContent>

				{/* Execution History Tab */}
				<TabsContent value="history">
					<ExecutionHistory
						executions={executions}
						loading={loading}
						onViewDetails={handleViewExecution}
						onRetry={handleRetryExecution}
					/>
				</TabsContent>
			</Tabs>

			{/* Modals */}
			<TemplatePreviewModal
				template={selectedTemplate}
				open={showPreviewModal}
				onClose={() => setShowPreviewModal(false)}
				onUseTemplate={(templateId) => {
					setShowPreviewModal(false);
					handleUseTemplate(templateId);
				}}
				serviceConnections={serviceConnections}
			/>

			<ServiceConnectionModal
				open={showServiceModal}
				onClose={() => setShowServiceModal(false)}
				serviceType={selectedService}
				onConnect={handleServiceConnect}
				existingConnection={serviceConnections.find(c => c.type === selectedService)}
			/>

			<WorkflowConfigModal
				open={showConfigModal}
				onClose={() => setShowConfigModal(false)}
				template={selectedTemplate}
				serviceConnections={serviceConnections}
				onActivate={handleActivateWorkflow}
				onConnectService={handleConnectService}
			/>

			<ExecutionDetailsModal
				execution={selectedExecution}
				open={showExecutionDetails}
				onClose={() => setShowExecutionDetails(false)}
				onRetry={handleRetryExecution}
			/>
		</div>
	);
}
