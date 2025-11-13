import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TimePeriod, AppSortOption } from '@/api-types';

interface AppFiltersFormProps {
  // Search props
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  searchPlaceholder?: string;
  showSearchButton?: boolean;

  // Framework filter props
  filterFramework: string;
  onFrameworkChange: (framework: string) => void;

  // Visibility filter props (optional - only for user apps)
  filterVisibility?: string;
  onVisibilityChange?: (visibility: string) => void;
  showVisibility?: boolean;

  // Time period props (conditional)
  period?: TimePeriod;
  onPeriodChange?: (period: TimePeriod) => void;
  sortBy?: AppSortOption;

  // Layout props
  className?: string;
}


export const AppFiltersForm: React.FC<AppFiltersFormProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder = 'Search apps...',
  showSearchButton = false,
  className = ''
}) => {

  return (
    <div className={`max-w-4xl mb-8 ${className}`}>
      <form onSubmit={onSearchSubmit} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400/70 z-10" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 bg-gradient-to-r from-bg-2/80 to-bg-2/60 backdrop-blur-md border-purple-500/20 focus:border-purple-400/40 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-200 hover:border-purple-400/30"
          />
        </div>


        {showSearchButton && (
          <Button
            type="submit"
            className="bg-gradient-to-r from-purple-500/80 to-blue-500/80 hover:from-purple-500 hover:to-blue-500 backdrop-blur-md border border-purple-400/30 hover:shadow-[0_0_25px_rgba(168,85,247,0.3)] transition-all duration-200"
          >
            Search
          </Button>
        )}
      </form>
    </div>
  );
};