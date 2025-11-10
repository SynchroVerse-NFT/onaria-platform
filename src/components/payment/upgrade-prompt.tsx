import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp, X, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Limit type that can trigger an upgrade prompt
 */
export type LimitType = 'ai_generations' | 'apps' | 'workflows' | 'storage';

/**
 * Props for the UpgradePrompt component
 */
export interface UpgradePromptProps {
  limitType: LimitType;
  percentage: number;
  currentUsage?: number;
  limit?: number;
  onUpgrade: () => void;
  onDismiss: () => void;
  autoShow?: boolean;
  threshold?: number;
  className?: string;
}

/**
 * Limit type configuration
 */
const LIMIT_CONFIG: Record<LimitType, {
  label: string;
  icon: React.ReactNode;
  upgradeMessage: (percentage: number) => string;
}> = {
  ai_generations: {
    label: 'AI Generations',
    icon: <Zap className="size-4" />,
    upgradeMessage: (percentage: number) =>
      `You've used ${percentage.toFixed(0)}% of your AI generations. Upgrade to Pro for unlimited access.`,
  },
  apps: {
    label: 'Apps Created',
    icon: <TrendingUp className="size-4" />,
    upgradeMessage: (percentage: number) =>
      `You've created ${percentage.toFixed(0)}% of your allowed apps. Upgrade to create unlimited apps.`,
  },
  workflows: {
    label: 'Workflow Executions',
    icon: <TrendingUp className="size-4" />,
    upgradeMessage: (percentage: number) =>
      `You've used ${percentage.toFixed(0)}% of your workflow executions. Upgrade for more capacity.`,
  },
  storage: {
    label: 'Storage',
    icon: <TrendingUp className="size-4" />,
    upgradeMessage: (percentage: number) =>
      `You've used ${percentage.toFixed(0)}% of your storage. Upgrade for additional storage space.`,
  },
};

/**
 * Get alert variant based on usage percentage
 */
function getAlertVariant(percentage: number): 'default' | 'destructive' {
  return percentage >= 90 ? 'destructive' : 'default';
}

/**
 * Get progress bar color based on usage percentage
 */
function getProgressColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-yellow-500';
  return 'bg-blue-500';
}

/**
 * UpgradePrompt component displays an alert/banner when approaching usage limits,
 * encouraging users to upgrade their plan. Can be dismissed or auto-shown based on threshold.
 */
export function UpgradePrompt({
  limitType,
  percentage,
  currentUsage,
  limit,
  onUpgrade,
  onDismiss,
  autoShow = true,
  threshold = 70,
  className,
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const config = LIMIT_CONFIG[limitType];
  const variant = getAlertVariant(percentage);
  const progressColor = getProgressColor(percentage);

  // Auto-show logic
  useEffect(() => {
    if (autoShow && percentage >= threshold && !isDismissed) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [percentage, threshold, autoShow, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Alert
      variant={variant}
      className={cn('relative pr-12', className)}
    >
      <AlertCircle className="size-4" />
      <AlertTitle className="flex items-center gap-2">
        {config.icon}
        {config.label} Limit Warning
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          {config.upgradeMessage(percentage)}
        </p>

        {currentUsage !== undefined && limit !== undefined && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span>Current Usage</span>
              <span className="font-semibold">
                {currentUsage.toLocaleString()} / {limit.toLocaleString()}
              </span>
            </div>
            <div className="relative">
              <Progress value={percentage} className="h-2" />
              <div
                className={cn(
                  'absolute top-0 left-0 h-2 rounded-full transition-all',
                  progressColor
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            onClick={onUpgrade}
            size="sm"
            variant={variant === 'destructive' ? 'default' : 'default'}
          >
            <TrendingUp className="mr-2 size-4" />
            Upgrade Now
          </Button>
        </div>
      </AlertDescription>

      <Button
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 size-6"
        onClick={handleDismiss}
      >
        <X className="size-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </Alert>
  );
}
