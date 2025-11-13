import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, RefreshCw, X, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppCard } from './AppCard';
import type { AppListData } from '@/hooks/use-paginated-apps';
import type { AppSortOption } from '@/api-types';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';

interface AppListContainerProps {
  apps: AppListData[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  sortBy: AppSortOption;
  onAppClick: (appId: string) => void;
  onToggleFavorite?: (appId: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  showUser?: boolean;
  showStats?: boolean;
  showActions?: boolean;
  infiniteScroll?: boolean;
  emptyState?: {
    title?: string;
    description?: string;
    action?: React.ReactNode;
  };
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05 // Reduced from 0.1 for faster animation
    }
  }
};

const getEmptyStateDefaults = (sortBy: AppSortOption, totalCount: number) => {
  if (totalCount === 0) {
    // No apps at all
    return {
      title: 'No apps yet',
      description: 'Start building your first app with AI assistance.'
    };
  }

  // Apps exist but current filter/sort shows none
  switch (sortBy) {
    case 'popular':
      return {
        title: 'No popular apps yet',
        description: 'Apps will appear here once they start getting views, stars, or forks.'
      };
    case 'starred':
      return {
        title: 'No bookmarked apps yet',
        description: 'Apps you bookmark will appear here. Click the bookmark icon on any app to add it.'
      };
    case 'trending':
      return {
        title: 'No trending apps yet',
        description: 'Apps will appear here based on recent activity and engagement.'
      };
    case 'recent':
    default:
      return {
        title: 'No apps match your filters',
        description: 'Try adjusting your search or filters to find what you\'re looking for.'
      };
  }
};

export const AppListContainer: React.FC<AppListContainerProps> = ({
  apps,
  loading,
  loadingMore,
  error,
  hasMore,
  totalCount,
  sortBy,
  onAppClick,
  onToggleFavorite,
  onLoadMore,
  onRetry,
  showUser = false,
  showStats = true,
  showActions = false,
  infiniteScroll = true,
  emptyState,
  className = ""
}) => {
  const defaultEmptyState = getEmptyStateDefaults(sortBy, totalCount);
  
  const { triggerRef } = useInfiniteScroll({
    threshold: 200,
    enabled: infiniteScroll && hasMore && !loadingMore,
    onLoadMore: onLoadMore
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-400" />
            <div className="absolute inset-0 h-8 w-8 mx-auto mb-4 bg-purple-500/20 blur-xl rounded-full" />
          </div>
          <p className="text-text-primary bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-medium">Loading apps...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md border border-red-400/30 p-4 mb-4 inline-flex shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <X className="h-6 w-6 text-red-400" />
        </div>
        <h3 className="text-xl text-text-secondary font-semibold mb-2">Failed to load apps</h3>
        <p className="text-text-tertiary mb-6">{error}</p>
        <Button
          onClick={onRetry}
          className="bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 backdrop-blur-md border border-purple-400/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (apps.length === 0) {
    const emptyStateContent = emptyState || defaultEmptyState;

    return (
      <div className="text-center py-20">
        <div className="relative inline-block mb-4">
          <Code2 className="h-16 w-16 mx-auto text-purple-400" />
          <div className="absolute inset-0 bg-purple-500/20 blur-2xl rounded-full" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-text-secondary">
          {emptyStateContent.title}
        </h3>
        <p className="text-text-tertiary mb-6">
          {emptyStateContent.description}
        </p>
        {'action' in emptyStateContent && emptyStateContent.action}
      </div>
    );
  }

  return (
    <div className={className}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {apps.map(app => (
            <AppCard 
              key={app.id} 
              app={app}
              onClick={onAppClick}
              onToggleFavorite={onToggleFavorite}
              showStats={showStats}
              showUser={showUser}
              showActions={showActions}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {infiniteScroll && hasMore && (
        <div 
          ref={triggerRef} 
          className="relative mt-8"
          style={{ height: loadingMore ? 'auto' : '80px' }}
        >
          {loadingMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Cosmic loading indicator */}
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md border border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                  <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                  <span className="text-sm text-purple-300">Loading more amazing apps...</span>
                </div>
              </div>

              {/* Cosmic skeleton placeholders */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={`skeleton-${i}`} className="animate-pulse">
                    <div className="bg-gradient-to-br from-bg-1/80 via-bg-1/60 to-bg-1/80 backdrop-blur-xl border border-purple-500/20 rounded-xl p-6 h-[200px]">
                      <div className="h-4 bg-gradient-to-r from-purple-500/30 to-blue-500/30 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded w-full mb-2"></div>
                      <div className="h-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!infiniteScroll && loadingMore && (
        <div className="flex justify-center mt-8">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-md border border-purple-400/30">
            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
            <span className="text-sm text-purple-300">Loading more apps...</span>
          </div>
        </div>
      )}

      {!infiniteScroll && hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="gap-2 bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 backdrop-blur-md border border-purple-400/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading more...
              </>
            ) : (
              <>
                Load more apps
              </>
            )}
          </Button>
        </div>
      )}

      {/* Show total count */}
      {totalCount > 0 && (
        <div className="text-center mt-6 text-sm text-text-tertiary">
          Showing {apps.length} of {totalCount} apps
        </div>
      )}
    </div>
  );
};