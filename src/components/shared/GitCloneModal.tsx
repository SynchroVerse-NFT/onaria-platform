import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	GitBranch,
	Copy,
	Check,
	Loader2,
	Eye,
	EyeOff,
	AlertCircle,
	Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { GitCloneTokenData } from '@/api-types';
import { motion } from 'framer-motion';

interface GitCloneModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	appId: string;
	appTitle: string;
	isPublic: boolean;
	isOwner: boolean;
}

export function GitCloneModal({
	open,
	onOpenChange,
	appId,
	appTitle,
	isPublic,
}: GitCloneModalProps) {
	const [tokenData, setTokenData] = useState<GitCloneTokenData | null>(null);
	const [isGenerating, setIsGenerating] = useState(false);
	const [copiedCommand, setCopiedCommand] = useState(false);
	const [copiedSetup, setCopiedSetup] = useState(false);
	const [tokenRevealed, setTokenRevealed] = useState(false);
	const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

	const host = window.location.host; // includes port
	const protocol = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
	const publicCloneUrl = `${protocol}://${host}/apps/${appId}.git`;

	useEffect(() => {
		if (!open) {
			setTokenData(null);
			setIsGenerating(false);
			setCopiedCommand(false);
			setCopiedSetup(false);
			setTokenRevealed(false);
			setTimeRemaining(null);
		}
	}, [open]);

	useEffect(() => {
		if (tokenData?.expiresAt) {
			const interval = setInterval(() => {
				const expiresAt = new Date(tokenData.expiresAt).getTime();
				const now = Date.now();
				const diff = expiresAt - now;

				if (diff <= 0) {
					setTimeRemaining('Expired');
					clearInterval(interval);
				} else {
					const minutes = Math.floor(diff / 60000);
					const seconds = Math.floor((diff % 60000) / 1000);
					setTimeRemaining(`${minutes}m ${seconds}s`);
				}
			}, 1000);

			return () => clearInterval(interval);
		}
	}, [tokenData?.expiresAt]);

	const handleGenerateToken = async () => {
		setIsGenerating(true);
		try {
			const response = await apiClient.generateGitCloneToken(appId);
			if (response.data) {
				setTokenData(response.data);
				toast.success('Token generated successfully');
			}
		} catch (error) {
			console.error('Failed to generate token:', error);
			toast.error('Failed to generate token');
		} finally {
			setIsGenerating(false);
		}
	};

	const normalizeAppTitle = (title: string): string => {
		return title
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '') // Remove special chars except spaces and hyphens
			.trim()
			.replace(/\s+/g, '-') // Replace spaces with hyphens
			.replace(/-+/g, '-') // Replace multiple hyphens with single
			.replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
	};

	const handleCopyCommand = async (text: string, setCopied: (val: boolean) => void) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			toast.success('Copied to clipboard!');
			setTimeout(() => setCopied(false), 2500);
		} catch (error) {
			toast.error('Failed to copy');
		}
	};

	const normalizedTitle = normalizeAppTitle(appTitle);

	const gitCloneCommand = isPublic
		? `git clone ${publicCloneUrl} ${normalizedTitle}`
		: tokenData
			? `git clone ${tokenData.cloneUrl} ${normalizedTitle}`
			: '';

	const setupCommands = `cd ${normalizedTitle}\nbun install\nbun run dev`;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[550px] max-w-[calc(100%-2rem)] bg-[#0f0f1a]/95 backdrop-blur-xl border-white/10 text-white">
				{/* Cosmic background glow */}
				<motion.div
					className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-xl -z-10"
					animate={{
						opacity: [0.3, 0.5, 0.3],
						scale: [1, 1.05, 1],
					}}
					transition={{
						duration: 3,
						repeat: Infinity,
						ease: 'easeInOut',
					}}
				/>

				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-white">
						<motion.div
							animate={{
								rotate: [0, 360],
							}}
							transition={{
								duration: 20,
								repeat: Infinity,
								ease: 'linear',
							}}
						>
							<GitBranch className="h-5 w-5 text-purple-400" />
						</motion.div>
						Clone Repository
					</DialogTitle>
					<DialogDescription className="text-white/60">
						{isPublic
							? 'Clone this app to your local machine'
							: 'Generate a temporary access token to clone this private repository'}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{isPublic ? (
						<>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-white/70">
										Clone Command
									</span>
									<motion.button
										onClick={() => handleCopyCommand(gitCloneCommand, setCopiedCommand)}
										className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.95 }}
									>
										{copiedCommand ? (
											<Check className="h-4 w-4 text-green-400" />
										) : (
											<Copy className="h-4 w-4 text-white/70" />
										)}
									</motion.button>
								</div>
								<code className="block p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 font-mono text-sm text-white break-all max-w-full">
									{gitCloneCommand}
								</code>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-white/70">Quick Start</span>
									<motion.button
										onClick={() => handleCopyCommand(setupCommands, setCopiedSetup)}
										className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.95 }}
									>
										{copiedSetup ? (
											<Check className="h-4 w-4 text-green-400" />
										) : (
											<Copy className="h-4 w-4 text-white/70" />
										)}
									</motion.button>
								</div>
								<code className="block p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 font-mono text-sm text-white whitespace-pre-wrap break-words max-w-full">
									{setupCommands}
								</code>
							</div>
						</>
					) : (
						<>
							{!tokenData ? (
								<div className="space-y-4">
									<div className="flex items-start gap-3 p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
										<AlertCircle className="h-5 w-5 text-purple-400 mt-0.5" />
										<div className="flex-1 space-y-1">
											<p className="text-sm font-medium text-white">
												Private Repository
											</p>
											<p className="text-sm text-white/60">
												Generate a temporary access token to clone this repository.
												The token expires in 1 hour.
											</p>
										</div>
									</div>

									<motion.button
										onClick={handleGenerateToken}
										disabled={isGenerating}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="w-full relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50 text-white p-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{/* Shimmer effect */}
										{!isGenerating && (
											<motion.div
												className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
												animate={{
													x: ['-100%', '200%'],
												}}
												transition={{
													duration: 2,
													repeat: Infinity,
													ease: 'linear',
												}}
											/>
										)}
										<span className="relative z-10 flex items-center justify-center gap-2">
											{isGenerating ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />
													Generating Token...
												</>
											) : (
												<>
													<GitBranch className="h-4 w-4" />
													Generate Clone Token
												</>
											)}
										</span>
									</motion.button>
								</div>
							) : (
								<>
									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-white/70">
												Clone Command
											</span>
											<div className="flex items-center gap-2">
												<motion.button
													onClick={() => setTokenRevealed(!tokenRevealed)}
													className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.95 }}
												>
													{tokenRevealed ? (
														<EyeOff className="h-4 w-4 text-white/70" />
													) : (
														<Eye className="h-4 w-4 text-white/70" />
													)}
												</motion.button>
												<motion.button
													onClick={() =>
														handleCopyCommand(gitCloneCommand, setCopiedCommand)
													}
													className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
													whileHover={{ scale: 1.1 }}
													whileTap={{ scale: 0.95 }}
												>
													{copiedCommand ? (
														<Check className="h-4 w-4 text-green-400" />
													) : (
														<Copy className="h-4 w-4 text-white/70" />
													)}
												</motion.button>
											</div>
										</div>
										<div className="relative">
											<code
												className={cn(
													'block p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 font-mono text-sm text-white break-all max-w-full',
													!tokenRevealed && 'blur-sm select-none',
												)}
											>
												{gitCloneCommand}
											</code>
											{!tokenRevealed && (
												<motion.button
													onClick={() => setTokenRevealed(true)}
													className="absolute inset-0 flex items-center justify-center bg-[#0f0f1a]/80 rounded-lg backdrop-blur-sm"
													whileHover={{ scale: 1.02 }}
													whileTap={{ scale: 0.98 }}
												>
													<div className="flex items-center gap-2 text-white">
														<Eye className="h-4 w-4" />
														<span className="text-sm font-medium">
															Click to reveal token
														</span>
													</div>
												</motion.button>
											)}
										</div>
									</div>

									<div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
										<Clock className="h-4 w-4 text-purple-400" />
										<span className="text-sm text-white/70">
											Token expires in:{' '}
											<span className="font-medium text-white">
												{timeRemaining}
											</span>
										</span>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-white/70">Quick Start</span>
											<motion.button
												onClick={() => handleCopyCommand(setupCommands, setCopiedSetup)}
												className="h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.95 }}
											>
												{copiedSetup ? (
													<Check className="h-4 w-4 text-green-400" />
												) : (
													<Copy className="h-4 w-4 text-white/70" />
												)}
											</motion.button>
										</div>
										<code className="block p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 font-mono text-sm text-white whitespace-pre-wrap break-words max-w-full">
											{setupCommands}
										</code>
									</div>

									<motion.button
										onClick={handleGenerateToken}
										disabled={isGenerating}
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										className="w-full bg-white/5 border border-white/10 text-white hover:bg-white/10 p-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{isGenerating ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
												Generating...
											</>
										) : (
											<>Generate New Token</>
										)}
									</motion.button>
								</>
							)}
						</>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
