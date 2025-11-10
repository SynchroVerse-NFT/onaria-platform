import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, TrendingUp, Zap, FolderOpen, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Usage data for a specific resource
 */
export interface UsageMetric {
  label: string;
  used: number;
  limit: number;
  unit?: string;
  icon?: React.ReactNode;
}

/**
 * Props for the UsageDashboard component
 */
export interface UsageDashboardProps {
  usageData: UsageMetric[];
  billingCycleStart?: string;
  billingCycleEnd?: string;
  onExportReport?: () => void;
  className?: string;
}

/**
 * Default icons for common usage types
 */
const DEFAULT_ICONS: Record<string, React.ReactNode> = {
  generations: <Zap className="size-4" />,
  apps: <FolderOpen className="size-4" />,
  workflows: <Workflow className="size-4" />,
  storage: <TrendingUp className="size-4" />,
};

/**
 * Calculate usage percentage
 */
function calculatePercentage(used: number, limit: number): number {
  if (limit <= 0) return 0;
  if (limit === -1 || limit === Infinity) return 0;
  return Math.min((used / limit) * 100, 100);
}

/**
 * Get color class based on usage percentage
 */
function getUsageColor(percentage: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (percentage >= 90) {
    return {
      bg: 'bg-red-500',
      text: 'text-red-600',
      border: 'border-red-500',
    };
  }
  if (percentage >= 70) {
    return {
      bg: 'bg-yellow-500',
      text: 'text-yellow-600',
      border: 'border-yellow-500',
    };
  }
  return {
    bg: 'bg-green-500',
    text: 'text-green-600',
    border: 'border-green-500',
  };
}

/**
 * Get icon for metric based on label
 */
function getIcon(label: string, customIcon?: React.ReactNode): React.ReactNode {
  if (customIcon) return customIcon;

  const lowerLabel = label.toLowerCase();
  for (const [key, icon] of Object.entries(DEFAULT_ICONS)) {
    if (lowerLabel.includes(key)) return icon;
  }

  return <TrendingUp className="size-4" />;
}

/**
 * UsageDashboard component displays detailed usage statistics for the current billing cycle
 * with color-coded progress bars and an export functionality.
 */
export function UsageDashboard({
  usageData,
  billingCycleStart,
  billingCycleEnd,
  onExportReport,
  className,
}: UsageDashboardProps) {
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Usage Dashboard</CardTitle>
            <CardDescription>
              {billingCycleStart && billingCycleEnd
                ? `Current billing cycle: ${billingCycleStart} - ${billingCycleEnd}`
                : 'Current billing cycle usage'}
            </CardDescription>
          </div>
          {onExportReport && (
            <Button variant="outline" size="sm" onClick={onExportReport}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {usageData.map((metric, index) => {
            const percentage = calculatePercentage(metric.used, metric.limit);
            const isUnlimited = metric.limit === -1 || metric.limit === Infinity;
            const colors = getUsageColor(percentage);
            const icon = getIcon(metric.label, metric.icon);

            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn('p-1.5 rounded-md bg-bg-2', colors.text)}>
                      {icon}
                    </div>
                    <span className="text-sm font-medium text-text-primary">
                      {metric.label}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-sm font-semibold', colors.text)}>
                      {metric.used.toLocaleString()}
                      {!isUnlimited && ` / ${metric.limit.toLocaleString()}`}
                      {metric.unit && ` ${metric.unit}`}
                    </div>
                    {!isUnlimited && (
                      <div className="text-xs text-text-secondary">
                        {percentage.toFixed(1)}% used
                      </div>
                    )}
                    {isUnlimited && (
                      <div className="text-xs text-text-secondary">
                        Unlimited
                      </div>
                    )}
                  </div>
                </div>

                {!isUnlimited && (
                  <div className="relative">
                    <Progress value={percentage} className="h-3" />
                    <div
                      className={cn(
                        'absolute top-0 left-0 h-3 rounded-full transition-all',
                        colors.bg
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}

                {!isUnlimited && percentage >= 90 && (
                  <div className="text-xs text-red-600 dark:text-red-400">
                    Warning: Approaching limit
                  </div>
                )}
              </div>
            );
          })}

          {usageData.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              No usage data available for the current billing cycle
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
