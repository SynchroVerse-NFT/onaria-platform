import React from 'react';
import { Clock, TrendingUp, ChevronDownIcon, Star } from 'lucide-react';
import type { AppSortOption } from '@/api-types';

interface SortOption {
  value: AppSortOption;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppSortTabsProps {
  value: AppSortOption;
  onValueChange: (value: AppSortOption) => void;
  availableSorts?: AppSortOption[];
  className?: string;
}

// Define all possible sort options with their display properties
const SORT_CONFIGURATIONS: Record<AppSortOption, SortOption> = {
  recent: {
    value: 'recent',
    label: 'Recent',
    icon: Clock
  },
  popular: {
    value: 'popular',
    label: 'Popular',
    icon: TrendingUp
  },
  trending: {
    value: 'trending',
    label: 'Trending',
    icon: TrendingUp
  },
  starred: {
    value: 'starred',
    label: 'Starred',
    icon: Star
  },
};

export const AppSortTabs: React.FC<AppSortTabsProps> = ({
  value,
  onValueChange,
  availableSorts = ['recent', 'popular', 'trending'],
}) => {
  const sortOptions = availableSorts.map((sortKey) => SORT_CONFIGURATIONS[sortKey]);

  return (<div className="grid grid-cols-1">
        <select
          id="location"
          name="location"
          value={value}
          onChange={(e) => onValueChange(e.target.value as AppSortOption)}
          className="col-start-1 row-start-1 w-full appearance-none rounded-lg bg-gradient-to-r from-bg-2/80 to-bg-2/60 backdrop-blur-md border border-purple-500/20 hover:border-purple-400/30 focus:border-purple-400/40 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] py-1.5 pl-3 pr-8 text-base text-text-primary transition-all duration-200 sm:text-sm/6 dark:*:bg-bg-1"
        >
          {sortOptions.map((e) => (<option key={e.value} value={e.value}>{e.label}</option>))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-purple-400/70 sm:size-4"
        />
      </div>);
};