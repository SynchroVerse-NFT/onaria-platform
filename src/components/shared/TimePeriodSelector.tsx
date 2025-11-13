import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import type { TimePeriod } from '@/api-types';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onValueChange: (period: TimePeriod) => void;
  className?: string;
  disabled?: boolean;
  showForSort?: 'popular' | 'trending' | 'all'; // Show only for certain sort types
}

const TIME_PERIODS: Array<{
  value: TimePeriod;
  label: string;
  shortLabel: string;
}> = [
  { value: 'today', label: 'Today', shortLabel: 'Today' },
  { value: 'week', label: 'This Week', shortLabel: 'Week' },
  { value: 'month', label: 'This Month', shortLabel: 'Month' },
  { value: 'all', label: 'All Time', shortLabel: 'All' },
];

export const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({
  value,
  onValueChange,
  className,
  disabled,
  showForSort = 'all'
}) => {
  // Don't show the selector for 'recent' sort - it doesn't make sense
  if (showForSort !== 'all' && showForSort !== 'popular' && showForSort !== 'trending') {
    return null;
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={`bg-gradient-to-r from-bg-2/80 to-bg-2/60 backdrop-blur-md border-purple-500/20 hover:border-purple-400/30 focus:border-purple-400/40 focus:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-all duration-200 ${className}`}>
        <Calendar className="h-4 w-4 text-purple-400/70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gradient-to-br from-bg-1/95 via-bg-1/90 to-bg-1/95 backdrop-blur-xl border-purple-500/20 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
        {TIME_PERIODS.map((period) => (
          <SelectItem
            key={period.value}
            value={period.value}
            className="focus:bg-gradient-to-r focus:from-purple-500/20 focus:to-blue-500/20 hover:bg-gradient-to-r hover:from-purple-500/20 hover:to-blue-500/20"
          >
            {period.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};