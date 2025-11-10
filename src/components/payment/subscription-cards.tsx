import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Subscription tier type
 */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/**
 * Usage statistics for a specific resource
 */
export interface UsageStat {
  label: string;
  used: number;
  limit: number;
  unit?: string;
}

/**
 * Props for the SubscriptionCards component
 */
export interface SubscriptionCardsProps {
  currentTier: SubscriptionTier;
  usageStats: UsageStat[];
  onUpgrade?: () => void;
  onManage?: () => void;
  className?: string;
}

/**
 * Tier configuration with display information
 */
const TIER_CONFIG: Record<SubscriptionTier, {
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  description: string;
}> = {
  free: {
    name: 'Free',
    icon: <Zap className="size-5" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    description: 'Perfect for getting started',
  },
  pro: {
    name: 'Pro',
    icon: <TrendingUp className="size-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
    description: 'For professional developers',
  },
  enterprise: {
    name: 'Enterprise',
    icon: <Crown className="size-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900',
    description: 'For teams and organizations',
  },
};

/**
 * Calculate usage percentage and determine color
 */
function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * SubscriptionCards component displays the user's current subscription tier,
 * usage statistics with progress bars, and actions for upgrading or managing subscription.
 */
export function SubscriptionCards({
  currentTier,
  usageStats,
  onUpgrade,
  onManage,
  className,
}: SubscriptionCardsProps) {
  const tierConfig = TIER_CONFIG[currentTier];
  const isEnterprise = currentTier === 'enterprise';

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', tierConfig.bgColor, tierConfig.color)}>
              {tierConfig.icon}
            </div>
            <div>
              <CardTitle className="text-xl">
                {tierConfig.name} Plan
              </CardTitle>
              <CardDescription>{tierConfig.description}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn(tierConfig.color)}>
            Current
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-text-primary">Usage This Billing Cycle</h3>
          {usageStats.map((stat, index) => {
            const percentage = stat.limit > 0 ? (stat.used / stat.limit) * 100 : 0;
            const isUnlimited = stat.limit === -1 || stat.limit === Infinity;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{stat.label}</span>
                  <span className="text-text-primary font-medium">
                    {stat.used.toLocaleString()}
                    {!isUnlimited && ` / ${stat.limit.toLocaleString()}`}
                    {stat.unit && ` ${stat.unit}`}
                    {isUnlimited && ' (Unlimited)'}
                  </span>
                </div>
                {!isUnlimited && (
                  <div className="relative">
                    <Progress value={percentage} className="h-2" />
                    <div
                      className={cn(
                        'absolute top-0 left-0 h-2 rounded-full transition-all',
                        getUsageColor(percentage)
                      )}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        {!isEnterprise && onUpgrade && (
          <Button onClick={onUpgrade} className="flex-1">
            <TrendingUp className="mr-2 size-4" />
            Upgrade Plan
          </Button>
        )}
        {onManage && (
          <Button variant="outline" onClick={onManage} className={cn(!isEnterprise && onUpgrade ? 'flex-1' : 'w-full')}>
            Manage Subscription
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
