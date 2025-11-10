import { useNavigate, useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { usePaginatedApps } from '@/hooks/use-paginated-apps';
import { AppListContainer } from '@/components/shared/AppListContainer';
import { FeaturedAppsCarousel } from '@/components/discover/FeaturedAppsCarousel';
import { CommunityStatsBar } from '@/components/discover/CommunityStatsBar';
import { AdvancedFilterBar } from '@/components/discover/AdvancedFilterBar';
import type { AppSortOption, AppWithUserAndStats } from '@/api-types';

export default function DiscoverPage() {
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const [category, setCategory] = useState('all');

	const allowedSorts: AppSortOption[] = ['recent', 'popular', 'trending', 'starred'];
	const sortParam = searchParams.get('sort') as AppSortOption | null;
	const savedSort = (typeof localStorage !== 'undefined' ? localStorage.getItem('discover.sort') : null) as AppSortOption | null;
	const initialSort: AppSortOption = (sortParam && allowedSorts.includes(sortParam))
		? sortParam
		: (savedSort && allowedSorts.includes(savedSort) ? savedSort : 'popular');

	const {
		searchQuery,
		setSearchQuery,
		filterFramework,
		sortBy,
		period,
		apps,
		loading,
		loadingMore,
		error,
		totalCount,
		hasMore,
		handleSearchSubmit,
		handlePeriodChange,
		handleFrameworkChange,
		handleSortChange,
		refetch,
		loadMore,
	} = usePaginatedApps({
		type: 'public',
		defaultSort: initialSort,
		defaultPeriod: 'week',
		limit: 20,
	});

	const featuredApps = useMemo(() => {
		const typedApps = apps as AppWithUserAndStats[];
		return typedApps
			.filter(app => (app.starCount || 0) > 5 || (app.viewCount || 0) > 100)
			.slice(0, 5);
	}, [apps]);

	const filteredApps = useMemo(() => {
		if (category === 'all') return apps;
		return apps.filter(app => {
			const desc = app.description?.toLowerCase() || '';
			const title = app.title?.toLowerCase() || '';
			const categoryLower = category.toLowerCase();
			return desc.includes(categoryLower) || title.includes(categoryLower);
		});
	}, [apps, category]);

	const appsToday = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return apps.filter(app => {
			if (!app.createdAt) return false;
			const createdAt = new Date(app.createdAt);
			return createdAt >= today;
		}).length;
	}, [apps]);

	const uniqueUsers = useMemo(() => {
		const userIds = new Set();
		apps.forEach(app => {
			const typedApp = app as AppWithUserAndStats;
			if (typedApp.userId) {
				userIds.add(typedApp.userId);
			}
		});
		return userIds.size;
	}, [apps]);

	return (
		<div className="min-h-screen bg-gradient-to-b from-bg-1 to-bg-2">
			<div className="container mx-auto px-4 py-8">
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
				>
					<div className="mb-8">
						<h1 className="text-6xl font-bold mb-3 font-[departureMono] text-accent">
							DISCOVER
						</h1>
						<p className="text-text-tertiary text-lg">
							Explore amazing apps built by the community with AI
						</p>
					</div>

					{featuredApps.length > 0 && (
						<FeaturedAppsCarousel
							apps={featuredApps}
							onAppClick={(appId) => navigate(`/app/${appId}`)}
						/>
					)}

					<CommunityStatsBar
						totalApps={totalCount}
						totalDevelopers={uniqueUsers}
						appsToday={appsToday}
						mostActiveCategory="AI"
					/>

					<AdvancedFilterBar
						searchQuery={searchQuery}
						onSearchChange={setSearchQuery}
						onSearchSubmit={handleSearchSubmit}
						category={category}
						onCategoryChange={(cat) => {
							setCategory(cat);
							try { localStorage.setItem('discover.category', cat); } catch {}
						}}
						framework={filterFramework}
						onFrameworkChange={handleFrameworkChange}
						sortBy={sortBy}
						onSortChange={(v) => {
							handleSortChange(v);
							try { localStorage.setItem('discover.sort', v); } catch {}
							const next = new URLSearchParams(searchParams);
							next.set('sort', v);
							setSearchParams(next, { replace: true });
						}}
						period={period}
						onPeriodChange={handlePeriodChange}
					/>

					<AppListContainer
						apps={filteredApps}
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
			</div>
		</div>
	);
}
