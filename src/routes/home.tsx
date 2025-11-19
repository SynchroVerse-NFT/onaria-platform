import { useRef, useState, useEffect, useMemo } from 'react';
import { ArrowRight, Info } from 'react-feather';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import {
	AgentModeToggle,
	type AgentMode,
} from '../components/agent-mode-toggle';
import { useAuthGuard } from '../hooks/useAuthGuard';
import { usePaginatedApps } from '@/hooks/use-paginated-apps';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { AppCard } from '@/components/shared/AppCard';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import clsx from 'clsx';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useDragDrop } from '@/hooks/use-drag-drop';
import { ImageUploadButton } from '@/components/image-upload-button';
import { ImageAttachmentPreview } from '@/components/image-attachment-preview';
import { SUPPORTED_IMAGE_MIME_TYPES } from '@/api-types';
import { ThemeToggle } from '@/components/theme-toggle';
import {
	LazyAnimatedBackground,
	LazyCursorAurora,
	LazyFloatingParticles,
	LazyInterstellarRings,
	LazyWormholeEffect,
} from '@/components/animations/lazy-animations';
import { toast } from 'sonner';

export default function Home() {
	const navigate = useNavigate();
	const { requireAuth } = useAuthGuard();
	const { showAuthModal } = useAuthModal();
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [agentMode, setAgentMode] = useState<AgentMode>('deterministic');
	const [query, setQuery] = useState('');
	const { user } = useAuth();
	const { theme } = useTheme();
	const [isFocused, setIsFocused] = useState(false);
	const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	const { images, addImages, removeImage, clearImages, isProcessing } = useImageUpload({
		onError: (error) => {
			toast.error(error);
		},
	});

	const { isDragging, dragHandlers } = useDragDrop({
		onFilesDropped: addImages,
		accept: [...SUPPORTED_IMAGE_MIME_TYPES],
	});


	const placeholderPhrases = useMemo(() => [
		"todo list app",
		"F1 fantasy game",
		"personal finance tracker"
	], []);
	const [currentPlaceholderPhraseIndex, setCurrentPlaceholderPhraseIndex] = useState(0);
	const [currentPlaceholderText, setCurrentPlaceholderText] = useState("");
	const [isPlaceholderTyping, setIsPlaceholderTyping] = useState(true);

	const {
		apps,
		loading,
	} = usePaginatedApps({
		type: 'public',
		defaultSort: 'popular',
		defaultPeriod: 'week',
		limit: 6,
	});

	// Discover section should appear only when enough apps are available and loading is done
	const discoverReady = useMemo(() => !loading && (apps?.length ?? 0) > 5, [loading, apps]);

	const handleCreateApp = (query: string, mode: AgentMode) => {
		try {
			if (!query.trim()) {
				toast.error('Please enter a description for your app');
				return;
			}

			const encodedQuery = encodeURIComponent(query);
			const encodedMode = encodeURIComponent(mode);

			// Encode images as JSON if present
			let imageParam = '';
			if (images.length > 0) {
				try {
					imageParam = `&images=${encodeURIComponent(JSON.stringify(images))}`;
				} catch (error) {
					toast.error('Failed to process images. Please try again.');
					console.error('Image encoding error:', error);
					return;
				}
			}

			const intendedUrl = `/chat/new?query=${encodedQuery}&agentMode=${encodedMode}${imageParam}`;

			if (
				!requireAuth({
					requireFullAuth: true,
					actionContext: 'to create applications',
					intendedUrl: intendedUrl,
				})
			) {
				return;
			}

			// User is already authenticated, navigate immediately
			navigate(intendedUrl);
			// Clear images after navigation
			clearImages();
		} catch (error) {
			toast.error('Failed to create app. Please try again.');
			console.error('Error creating app:', error);
		}
	};

	// Auto-resize textarea based on content
	const adjustTextareaHeight = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = 'auto';
			const scrollHeight = textareaRef.current.scrollHeight;
			const maxHeight = 300; // Maximum height in pixels
			textareaRef.current.style.height =
				Math.min(scrollHeight, maxHeight) + 'px';
		}
	};

	useEffect(() => {
		adjustTextareaHeight();
	}, []);

	// Typewriter effect
	useEffect(() => {
		const currentPhrase = placeholderPhrases[currentPlaceholderPhraseIndex];

		if (isPlaceholderTyping) {
			if (currentPlaceholderText.length < currentPhrase.length) {
				const timeout = setTimeout(() => {
					setCurrentPlaceholderText(currentPhrase.slice(0, currentPlaceholderText.length + 1));
				}, 100); // Typing speed
				return () => clearTimeout(timeout);
			} else {
				// Pause before erasing
				const timeout = setTimeout(() => {
					setIsPlaceholderTyping(false);
				}, 2000); // Pause duration
				return () => clearTimeout(timeout);
			}
		} else {
			if (currentPlaceholderText.length > 0) {
				const timeout = setTimeout(() => {
					setCurrentPlaceholderText(currentPlaceholderText.slice(0, -1));
				}, 50); // Erasing speed
				return () => clearTimeout(timeout);
			} else {
				// Move to next phrase
				setCurrentPlaceholderPhraseIndex((prev) => (prev + 1) % placeholderPhrases.length);
				setIsPlaceholderTyping(true);
			}
		}
	}, [currentPlaceholderText, currentPlaceholderPhraseIndex, isPlaceholderTyping, placeholderPhrases]);

	const discoverLinkRef = useRef<HTMLDivElement>(null);

	const suggestionChips = useMemo(() => ['todo list app', 'F1 fantasy game', 'personal finance tracker', 'portfolio website'], []);

	return (
		<div
			className={clsx(
				"relative size-full overflow-hidden transition-colors duration-500",
				isDark ? 'bg-[#0a0a0f]' : 'bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50'
			)}
		>
			{/* Five Animation Layers */}
			<LazyWormholeEffect isFocused={isFocused} />
			<LazyAnimatedBackground isDark={isDark} />
			<LazyCursorAurora />
			<LazyFloatingParticles />
			<LazyInterstellarRings />

			{/* Top Bar with Logo, Auth Button, and Theme Toggle */}
			<motion.div
				className="absolute top-6 left-6 right-6 z-50 flex items-center justify-between"
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, delay: 0.2 }}
			>
				{/* Left: Logo */}
				<motion.div
					className={clsx(
						"px-5 py-2.5 rounded-lg backdrop-blur-sm border flex items-center gap-2 transition-colors duration-500",
						isDark
							? 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border-blue-500/30 text-white'
							: 'bg-white/70 border-gray-200/50 text-gray-900'
					)}
					whileHover={{ scale: 1.05, x: 2 }}
					animate={{
						boxShadow: [
							'0 0 20px rgba(100, 181, 246, 0)',
							'0 0 20px rgba(100, 181, 246, 0.4)',
							'0 0 20px rgba(100, 181, 246, 0)',
						],
					}}
					transition={{
						boxShadow: {
							duration: 2,
							repeat: Infinity,
							ease: 'easeInOut',
						},
					}}
				>
					<span className="font-bold text-lg">#BuildOnAria</span>
					<motion.div
						className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
						initial={{ width: 0 }}
						animate={{ width: '100%' }}
						transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
					/>
				</motion.div>

				{/* Right: Auth Button and Theme Toggle */}
				<motion.div
					className="flex items-center gap-3"
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6, delay: 0.2 }}
				>
					{user ? (
						<motion.button
							onClick={() => navigate('/apps')}
							className={clsx(
								"px-4 py-2 rounded-lg backdrop-blur-sm border transition-all flex items-center gap-2",
								isDark
									? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 text-white/70 hover:text-white'
									: 'bg-white/70 border-gray-200/50 text-gray-700 hover:text-gray-900'
							)}
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.98 }}
						>
							My Apps
						</motion.button>
					) : (
						<motion.button
							onClick={() => showAuthModal()}
							className={clsx(
								"px-4 py-2 rounded-lg backdrop-blur-sm border transition-all flex items-center gap-2",
								isDark
									? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-500/30 hover:border-purple-400/50 text-white/70 hover:text-white'
									: 'bg-white/70 border-gray-200/50 text-gray-700 hover:text-gray-900'
							)}
							whileHover={{ scale: 1.05, x: -2 }}
							whileTap={{ scale: 0.98 }}
							animate={{
								boxShadow: [
									'0 0 20px rgba(168, 85, 247, 0)',
									'0 0 20px rgba(168, 85, 247, 0.4)',
									'0 0 20px rgba(168, 85, 247, 0)',
								],
							}}
							transition={{
								boxShadow: {
									duration: 2,
									repeat: Infinity,
									ease: 'easeInOut',
								},
							}}
						>
							Sign In
						</motion.button>
					)}
					<div className={clsx(
						"rounded-lg backdrop-blur-sm border",
						isDark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-gray-200/50'
					)}>
						<ThemeToggle />
					</div>
				</motion.div>
			</motion.div>

			{/* Main Content */}
			<div className="size-full flex flex-col items-center px-4 relative z-10">
				<LayoutGroup>
					<div className="w-full max-w-2xl">
						<motion.div
							layout
							transition={{ layout: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
							className={clsx(
								"flex flex-col items-center",
								discoverReady ? "mt-32" : "mt-[20vh] sm:mt-[24vh]"
							)}
						>
							{/* Animated Heading */}
							<div className="text-center mb-6 relative">
								<motion.h1
									className={clsx(
										"text-3xl sm:text-4xl lg:text-5xl font-bold relative inline-block transition-colors duration-500",
										isDark ? 'text-white' : 'text-gray-900'
									)}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
								>
									{'What should we build today?'.split('').map((char, index) => (
										<motion.span
											key={index}
											initial={{ opacity: 0, y: 20, filter: 'blur(8px)', rotateX: 90 }}
											animate={{ opacity: 1, y: 0, filter: 'blur(0px)', rotateX: 0 }}
											transition={{
												duration: 0.5,
												delay: index * 0.03,
												ease: [0.22, 1, 0.36, 1]
											}}
											style={{
												display: 'inline-block',
												whiteSpace: 'pre',
												transformStyle: 'preserve-3d',
												perspective: '1000px'
											}}
											whileHover={{
												scale: 1.2,
												color: '#64b5f6',
												transition: { duration: 0.2 }
											}}
										>
											{char}
										</motion.span>
									))}

									<motion.div
										className="absolute inset-0 -z-10"
										animate={{
											scale: [1, 1.1, 1],
											opacity: [0.1, 0.3, 0.1],
										}}
										transition={{
											duration: 4,
											repeat: Infinity,
											ease: 'easeInOut',
										}}
										style={{
											background: 'radial-gradient(circle, rgba(100, 181, 246, 0.3) 0%, transparent 70%)',
											filter: 'blur(40px)',
										}}
									/>
								</motion.h1>
							</div>

							{/* Input Form */}
							<motion.div
								initial={{ opacity: 0, scale: 0.9, y: 20 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								transition={{ duration: 0.6, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
								className="relative w-full"
								style={{
									transformStyle: 'preserve-3d',
									perspective: '1000px',
								}}
							>
								{isFocused && (
									<>
										{[...Array(8)].map((_, i) => (
											<motion.div
												key={i}
												className="absolute w-2 h-2 rounded-full bg-blue-400/60"
												style={{
													left: '50%',
													top: '50%',
												}}
												animate={{
													x: [0, Math.cos((i / 8) * Math.PI * 2) * 150],
													y: [0, Math.sin((i / 8) * Math.PI * 2) * 80],
													scale: [0, 1, 0],
													opacity: [0, 1, 0],
												}}
												transition={{
													duration: 2,
													repeat: Infinity,
													delay: i * 0.125,
													ease: 'linear',
												}}
											/>
										))}
									</>
								)}

								<motion.div
									animate={{
										boxShadow: isFocused
											? '0 0 0 2px rgba(100, 181, 246, 0.5), 0 20px 60px rgba(100, 181, 246, 0.3), 0 0 100px rgba(168, 85, 247, 0.2)'
											: '0 0 0 1px rgba(255, 255, 255, 0.1), 0 10px 30px rgba(0, 0, 0, 0.5)',
										rotateX: isFocused ? 2 : 0,
										rotateY: isFocused ? 1 : 0,
									}}
									transition={{ duration: 0.3 }}
									className={clsx(
										"rounded-2xl overflow-hidden backdrop-blur-xl transition-colors duration-500 border relative",
										isDark ? 'bg-[#0f0f1a]/90 border-white/5' : 'bg-white/70 border-gray-200/50'
									)}
									style={{
										transformStyle: 'preserve-3d',
									}}
								>
									{isFocused && (
										<motion.div
											className="absolute inset-0 rounded-2xl pointer-events-none"
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											style={{
												background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.4) 0%, rgba(168, 85, 247, 0.3) 100%)',
												clipPath: 'polygon(0% 0%, 0% 100%, 46% 100%, 50% 97%, 54% 100%, 100% 100%, 100% 0%, 0% 0%, 0% 2px, calc(100% - 2px) 2px, calc(100% - 2px) calc(100% - 2px), 54% calc(100% - 2px), 50% calc(100% - 8px), 46% calc(100% - 2px), 2px calc(100% - 2px), 2px 2px, 0% 2px)',
												zIndex: 1,
											}}
										/>
									)}

									<form
										method="POST"
										onSubmit={(e) => {
											e.preventDefault();
											const query = textareaRef.current!.value;
											handleCreateApp(query, agentMode);
										}}
										className="relative"
									>
										<div
											className={clsx(
												"relative",
												isDragging && "ring-2 ring-accent ring-offset-2 rounded-lg"
											)}
											{...dragHandlers}
										>
											{isDragging && (
												<div className="absolute inset-0 flex items-center justify-center bg-accent/10 backdrop-blur-sm rounded-lg z-30 pointer-events-none">
													<p className="text-accent font-medium">Drop images here</p>
												</div>
											)}

											{images.length > 0 && (
												<div className="px-6 pt-5 pb-3">
													<ImageAttachmentPreview
														images={images}
														onRemove={removeImage}
													/>
												</div>
											)}

											<textarea
												ref={textareaRef}
												value={query}
												onChange={(e) => {
													setQuery(e.target.value);
													adjustTextareaHeight();
												}}
												onFocus={() => setIsFocused(true)}
												onBlur={() => setIsFocused(false)}
												onInput={adjustTextareaHeight}
												onKeyDown={(e) => {
													if (e.key === 'Enter' && !e.shiftKey) {
														e.preventDefault();
														const query = textareaRef.current!.value;
														handleCreateApp(query, agentMode);
													}
												}}
												placeholder={`Create a ${currentPlaceholderText}`}
												className={clsx(
													"w-full px-6 py-5 bg-transparent resize-none outline-none min-h-[120px] transition-colors duration-500",
													isDark ? 'text-white/90 placeholder:text-white/40' : 'text-gray-900 placeholder:text-gray-400'
												)}
											/>

											<motion.div
												className={clsx(
													"flex items-center justify-between px-4 py-3 border-t transition-colors duration-500",
													isDark ? 'border-white/5' : 'border-gray-200/50'
												)}
												initial={{ opacity: 0, y: 10 }}
												animate={{ opacity: 1, y: 0 }}
												transition={{ delay: 1.2 }}
											>
												<div className="flex items-center gap-2">
													{import.meta.env.VITE_AGENT_MODE_ENABLED && (
														<AgentModeToggle
															value={agentMode}
															onChange={setAgentMode}
															className="flex-1"
														/>
													)}
													<ImageUploadButton
														onFilesSelected={addImages}
														disabled={isProcessing}
													/>
												</div>

												<motion.button
													type="submit"
													disabled={!query.trim()}
													className={clsx(
														"px-6 py-2.5 rounded-lg flex items-center justify-center text-white shadow-lg relative overflow-hidden transition-opacity",
														!query.trim()
															? 'opacity-40 cursor-not-allowed bg-gradient-to-r from-gray-400 to-gray-500'
															: 'bg-gradient-to-r from-[#64b5f6] via-[#a855f7] to-[#ff5722]'
													)}
													whileHover={query.trim() ? {
														scale: 1.05,
														boxShadow: '0 8px 30px rgba(100, 181, 246, 0.6), 0 0 60px rgba(168, 85, 247, 0.4)',
													} : {}}
													whileTap={query.trim() ? { scale: 0.95 } : {}}
													transition={{
														type: 'spring',
														stiffness: 300,
														damping: 20
													}}
												>
													{query.trim() && (
														<motion.div
															className="absolute inset-0 rounded-lg border-2 border-white/50"
															initial={{ scale: 1, opacity: 0 }}
															whileHover={{
																scale: 1.3,
																opacity: [0, 1, 0],
															}}
															transition={{ duration: 0.6 }}
														/>
													)}
													<span className="relative z-10 font-semibold flex items-center gap-2">
														Build <ArrowRight className="size-4" />
													</span>
												</motion.button>
											</motion.div>
										</div>
									</form>
								</motion.div>

								<motion.div
									className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#64b5f6] via-[#a855f7] to-[#ff5722] -z-10"
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{
										opacity: isFocused ? 0.4 : 0,
										scale: isFocused ? 1.08 : 0.8,
										rotate: isFocused ? 180 : 0,
									}}
									style={{ filter: 'blur(30px)' }}
									transition={{ duration: 0.6 }}
								/>
							</motion.div>

							{/* Suggestion Chips */}
							<motion.div
								className="flex flex-wrap gap-3 mt-8 justify-center"
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 1.4, duration: 0.6 }}
							>
								{suggestionChips.map((suggestion, index) => (
									<motion.button
										key={suggestion}
										className={clsx(
											"px-4 py-2 rounded-full backdrop-blur-sm border transition-all relative overflow-hidden",
											isDark
												? 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-blue-400/30'
												: 'bg-white/50 border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:border-blue-400/50'
										)}
										initial={{ opacity: 0, scale: 0.8, rotateX: 90 }}
										animate={{ opacity: 1, scale: 1, rotateX: 0 }}
										transition={{
											delay: 1.4 + index * 0.1,
											type: 'spring',
											stiffness: 200,
										}}
										whileHover={{
											scale: 1.05,
											y: -2,
											boxShadow: '0 8px 20px rgba(100, 181, 246, 0.3)',
											rotateX: 5,
										}}
										whileTap={{ scale: 0.95 }}
										onClick={() => setQuery(suggestion)}
										style={{
											transformStyle: 'preserve-3d',
											perspective: '1000px'
										}}
									>
										<motion.div
											className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
											animate={{
												x: ['-100%', '200%'],
											}}
											transition={{
												duration: 3,
												repeat: Infinity,
												delay: index * 0.5,
											}}
										/>
										<span className="relative z-10">{suggestion}</span>
									</motion.button>
								))}
							</motion.div>
						</motion.div>
					</div>

					{/* Images Info Banner */}
					<AnimatePresence>
						{images.length > 0 && (
							<motion.div
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -10 }}
								className="w-full max-w-2xl px-6 mt-4"
							>
								<div className={clsx(
									"flex items-start gap-2 px-4 py-3 rounded-xl backdrop-blur-sm border shadow-sm",
									isDark ? 'bg-bg-2/50 border-accent/30' : 'bg-bg-4/50 border-accent/20'
								)}>
									<Info className="size-4 text-accent flex-shrink-0 mt-0.5" />
									<p className="text-xs text-text-tertiary leading-relaxed">
										<span className="font-medium text-text-secondary">Images Beta:</span> Images guide app layout and design but may not be replicated exactly. The coding agent cannot access images directly for app assets.
									</p>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* Discover Section */}
					<AnimatePresence>
						{discoverReady && (
							<motion.section
								key="discover-section"
								layout
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
								className={clsx('max-w-6xl mx-auto px-4 z-10', images.length > 0 ? 'mt-10' : 'mt-16 mb-8')}
							>
								<div className='flex flex-col items-start'>
									<h2 className="text-2xl font-medium text-text-secondary/80">Discover Apps built by the community</h2>
									<div ref={discoverLinkRef} className="text-md font-light mb-4 text-text-tertiary hover:underline underline-offset-4 select-text cursor-pointer" onClick={() => navigate('/discover')} >View All</div>
									<motion.div
										layout
										transition={{ duration: 0.4 }}
										className="grid grid-cols-2 xl:grid-cols-3 gap-6"
									>
										<AnimatePresence mode="popLayout">
											{apps.map(app => (
												<AppCard
													key={app.id}
													app={app}
													onClick={() => navigate(`/app/${app.id}`)}
													showStats={true}
													showUser={true}
													showActions={false}
												/>
											))}
										</AnimatePresence>
									</motion.div>
								</div>
							</motion.section>
						)}
					</AnimatePresence>
				</LayoutGroup>

				{/* Nudge towards Discover */}
				{user && discoverReady && <CurvedArrow sourceRef={discoverLinkRef} target={{ x: 50, y: window.innerHeight - 60 }} />}
			</div>
		</div>
	);
}



type ArrowProps = {
	/** Ref to the source element the arrow starts from */
	sourceRef: React.RefObject<HTMLElement | null>;
	/** Target point in viewport/client coordinates */
	target: { x: number; y: number };
	/** Curve intensity (0.1 - 1.5 is typical) */
	curvature?: number;
	/** Optional pixel offset from source element edge */
	sourceOffset?: number;
	/** If true, hides the arrow when the source is offscreen/not measurable */
	hideWhenInvalid?: boolean;
};

type Point = { x: number; y: number };

export const CurvedArrow: React.FC<ArrowProps> = ({
	sourceRef,
	target,
	curvature = 0.5,
	sourceOffset = 6,
	hideWhenInvalid = true,
}) => {
	const [start, setStart] = useState<Point | null>(null);
	const [end, setEnd] = useState<Point | null>(null);

	const rafRef = useRef<number | null>(null);
	const roRef = useRef<ResizeObserver | null>(null);

	const compute = () => {
		const el = sourceRef.current;
		if (!el) {
			setStart(null);
			setEnd(null);
			return;
		}

		const rect = el.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) {
			setStart(null);
			setEnd(null);
			return;
		}

		const endPoint: Point = { x: target.x, y: target.y };

		// Choose an anchor on the source: midpoint of the side facing the target
		const centers = {
			right: { x: rect.right, y: rect.top + rect.height / 2 },
			left: { x: rect.left, y: rect.top + rect.height / 2 },
		};

		// Distances to target from each side center
		const dists = Object.fromEntries(
			Object.entries(centers).map(([side, p]) => [
				side,
				(p.x - endPoint.x) ** 2 + (p.y - endPoint.y) ** 2,
			])
		) as Record<keyof typeof centers, number>;

		const bestSide = (Object.entries(dists).sort((a, b) => a[1] - b[1])[0][0] ||
			"right") as keyof typeof centers;

		// Nudge start point slightly outside the element for visual clarity
		const nudge = (p: Point, side: keyof typeof centers, offset: number) => {
			switch (side) {
				case "right":
					return { x: p.x + offset, y: p.y };
				case "left":
					return { x: p.x - offset, y: p.y };
			}
		};

		const startPoint = nudge(centers[bestSide], bestSide, sourceOffset);

		setStart(startPoint);
		setEnd(endPoint);
	};

	// Throttle updates with rAF to avoid layout thrash
	const scheduleCompute = () => {
		if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
		rafRef.current = requestAnimationFrame(compute);
	};

	useEffect(() => {
		scheduleCompute();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target.x, target.y, sourceRef.current]);

	useEffect(() => {
		const onScroll = () => scheduleCompute();
		const onResize = () => scheduleCompute();

		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onResize);

		// Track source element size changes
		const el = sourceRef.current;
		if ("ResizeObserver" in window) {
			roRef.current = new ResizeObserver(() => scheduleCompute());
			if (el) roRef.current.observe(el);
		}

		scheduleCompute();

		return () => {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onResize);
			if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
			if (roRef.current && el) roRef.current.unobserve(el);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const d = useMemo(() => {
		if (!start || !end) return "";

		const dx = end.x - start.x;
		const dy = end.y - start.y;

		// Control points: bend the curve based on the primary axis difference.
		// This gives a nice S or C curve without sharp kinks.
		const cpOffset = Math.max(Math.abs(dx), Math.abs(dy)) * curvature;

		const c1: Point = { x: start.x + cpOffset * (dx >= 0 ? 1 : -1), y: start.y };
		const c2: Point = { x: end.x - cpOffset * (dx >= 0 ? 1 : -1), y: end.y };

		return `M ${start.x},${start.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
	}, [start, end, curvature]);

	const hidden = hideWhenInvalid && (!start || !end);

	if (start && end && (end.y - start.y > 420 || start.x - end.x < 100)) {
		return null;
	}

	return (
		<svg
			aria-hidden="true"
			style={{
				position: "fixed",
				inset: 0,
				width: "100vw",
				height: "100vh",
				pointerEvents: "none",
				overflow: "visible",
				zIndex: 9999,
				display: hidden ? "none" : "block",
			}}
		>
			<defs>
				<filter id="discover-squiggle" x="-20%" y="-20%" width="140%" height="140%">
					<feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" seed="3" result="noise" />
					<feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
				</filter>
				<marker id="discover-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth" opacity={0.20}>
					<path d="M 0 1.2 L 7 4" stroke="var(--color-text-tertiary)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
					<path d="M 0 6.8 L 7 4" stroke="var(--color-text-tertiary)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
				</marker>
			</defs>

			<path
				d={d}
				// stroke="var(--color-accent)"
				stroke="var(--color-text-tertiary)"
				strokeOpacity={0.20}
				strokeWidth={1.6}
				fill="none"
				strokeLinecap="round"
				strokeLinejoin="round"
				vectorEffect="non-scaling-stroke"
				markerEnd="url(#discover-arrowhead)"
			/>
			{/* Soft squiggle overlay for hand-drawn feel */}
			<g filter="url(#discover-squiggle)">
				<path
					d={d}
					// stroke="var(--color-accent)"
					stroke="var(--color-text-tertiary)"
					strokeOpacity={0.12}
					strokeWidth={1}
					fill="none"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeDasharray="8 6 4 9 5 7"
					vectorEffect="non-scaling-stroke"
				/>
			</g>
		</svg>
	);
};
