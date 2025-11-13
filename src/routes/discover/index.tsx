import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { usePaginatedApps } from '@/hooks/use-paginated-apps';
import { AppListContainer } from '@/components/shared/AppListContainer';
import { AppFiltersForm } from '@/components/shared/AppFiltersForm';
import { AppSortTabs } from '@/components/shared/AppSortTabs';
import { useTheme } from '@/contexts/theme-context';
import AnimatedBackground from '@/components/animations/AnimatedBackground';
import type { AppSortOption } from '@/api-types';

export default function DiscoverPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { theme } = useTheme();
	const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

	// Derive initial sort from URL or localStorage, fallback to 'popular'
	const allowedSorts: AppSortOption[] = ['recent', 'popular', 'trending', 'starred'];
	const sortParam = searchParams.get('sort') as AppSortOption | null;
	const savedSort = (typeof localStorage !== 'undefined' ? localStorage.getItem('discover.sort') : null) as AppSortOption | null;
	const initialSort: AppSortOption = (sortParam && allowedSorts.includes(sortParam))
		? sortParam
		: (savedSort && allowedSorts.includes(savedSort) ? savedSort : 'popular');

	const {
		// Filter state
		searchQuery,
		setSearchQuery,
		filterFramework,
		sortBy,
		period,

		// Data state
		apps,
		loading,
		loadingMore,
		error,
		totalCount,
		hasMore,

		// Form handlers
		handleSearchSubmit,
		handlePeriodChange,
		handleFrameworkChange,

		handleSortChange,

		// Pagination handlers

		refetch,
		loadMore,
	} = usePaginatedApps({
		type: 'public',
		defaultSort: initialSort,
		defaultPeriod: 'week',
		limit: 20,
	});

	return (
		<div className="relative min-h-screen overflow-hidden transition-colors duration-500" style={{
			backgroundColor: isDark ? '#0a0a0f' : '#f0f4ff'
		}}>
			{/* Cosmic Background */}
			<AnimatedBackground isDark={isDark} />

			{/* Content Layer */}
			<div className="relative z-10">
				<div className="container mx-auto px-4 py-8">
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
					>
						{/* Header with Cosmic Styling */}
						<div className="mb-10">
							<motion.h1
								className="text-6xl font-bold mb-4 font-[DepartureMono] bg-gradient-to-r from-cosmic-blue via-cosmic-purple to-cosmic-pink bg-clip-text text-transparent"
								initial={{ opacity: 0, y: -30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
							>
								DISCOVER
							</motion.h1>
							<motion.p
								className="text-text-secondary text-lg"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.6, delay: 0.2 }}
							>
								Explore apps built by the community
							</motion.p>
						</div>

						{/* Search and Filters with Cosmic Styling */}
						<motion.div
							className="flex items-start gap-4 justify-between mb-8"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
						>
							{/* Search and Filters */}
							<AppFiltersForm
								searchQuery={searchQuery}
								onSearchChange={setSearchQuery}
								onSearchSubmit={handleSearchSubmit}
								searchPlaceholder="Search apps..."
								showSearchButton={true}
								filterFramework={filterFramework}
								period={period}
								onFrameworkChange={handleFrameworkChange}
								onPeriodChange={handlePeriodChange}
								sortBy={sortBy}
							/>

							{/* Sort Tabs */}
							<AppSortTabs
								value={sortBy}
								onValueChange={(v) => {
									handleSortChange(v);
									// Persist to URL and localStorage
									try { localStorage.setItem('discover.sort', v); } catch {}
									const next = new URLSearchParams(searchParams);
									next.set('sort', v);
									setSearchParams(next, { replace: true });
								}}
								availableSorts={['recent', 'popular', 'trending', 'starred']}
							/>
						</motion.div>

						{/* Unified App List with Cosmic Transitions */}
						<motion.div
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
						>
							<AppListContainer
								apps={apps}
								loading={loading}
								loadingMore={loadingMore}
								error={error}
								hasMore={hasMore}
								totalCount={totalCount}
								sortBy={sortBy}
								onAppClick={(appId) => navigate(`/app/${appId}`)}
								onLoadMore={loadMore}
								onRetry={refetch}
								showUser={true}
								showStats={true}
								infiniteScroll={true}
							/>
						</motion.div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}
