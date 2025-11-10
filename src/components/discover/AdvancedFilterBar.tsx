import React from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AppSortOption, TimePeriod } from '@/api-types';

interface AdvancedFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;

  category: string;
  onCategoryChange: (category: string) => void;

  framework: string;
  onFrameworkChange: (framework: string) => void;

  sortBy: AppSortOption;
  onSortChange: (sort: AppSortOption) => void;

  period?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;

  className?: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'saas', label: 'SaaS' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'ai', label: 'AI' },
  { value: 'social', label: 'Social' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'landing', label: 'Landing Page' },
];

const FRAMEWORKS = [
  { value: 'all', label: 'All Frameworks' },
  { value: 'react', label: 'React' },
  { value: 'nextjs', label: 'Next.js' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'angular', label: 'Angular' },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'trending', label: 'Trending' },
  { value: 'starred', label: 'Most Stars' },
];

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  category,
  onCategoryChange,
  framework,
  onFrameworkChange,
  sortBy,
  onSortChange,
  period,
  onPeriodChange,
  className
}) => {
  const activeFiltersCount = [
    category !== 'all',
    framework !== 'all',
    period && period !== 'all',
  ].filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={cn('mb-8', className)}
    >
      <div className="flex flex-col gap-4">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            type="text"
            placeholder="Search apps by name, description, or technology..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 h-12 text-base bg-bg-3/50 border-border-primary focus:bg-bg-3"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-text-tertiary">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="font-medium">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={framework} onValueChange={onFrameworkChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent>
                {FRAMEWORKS.map((fw) => (
                  <SelectItem key={fw.value} value={fw.value}>
                    {fw.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => onSortChange(value as AppSortOption)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((sort) => (
                  <SelectItem key={sort.value} value={sort.value}>
                    {sort.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {onPeriodChange && period && (
              <Select value={period} onValueChange={(value) => onPeriodChange(value as TimePeriod)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue placeholder="Time period" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onCategoryChange('all');
                  onFrameworkChange('all');
                  if (onPeriodChange) onPeriodChange('all');
                }}
                className="h-9 text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
