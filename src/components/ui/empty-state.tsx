import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'secondary';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  type?: 'no-data' | 'loading' | 'error' | 'no-results';
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  type = 'no-data',
  className,
  children,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (type === 'loading') {
      return (
        <div className="relative inline-block mb-6">
          <Loader2 className="h-16 w-16 text-cosmic-blue animate-spin" />
          <div className="absolute inset-0 bg-cosmic-blue/20 blur-2xl rounded-full" />
        </div>
      );
    }

    if (type === 'error') {
      return (
        <div className="relative inline-block mb-6">
          <div className="p-4 rounded-full bg-gradient-to-r from-red-500/20 to-orange-500/20 backdrop-blur-md border border-red-400/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertCircle className="h-12 w-12 text-red-400" />
          </div>
        </div>
      );
    }

    if (icon) {
      return (
        <div className="relative inline-block mb-6">
          <div className="text-cosmic-blue">{icon}</div>
          <div className="absolute inset-0 bg-cosmic-blue/20 blur-2xl rounded-full" />
        </div>
      );
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] py-12 px-6',
        'backdrop-blur-xl bg-white/5 dark:bg-black/10',
        'border border-white/10 dark:border-white/5',
        'rounded-2xl',
        className
      )}
    >
      {renderIcon()}

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-bold mb-3 text-text-primary text-center bg-gradient-to-r from-cosmic-blue via-cosmic-purple to-cosmic-pink bg-clip-text text-transparent"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-text-secondary text-center max-w-md mb-8"
      >
        {description}
      </motion.p>

      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          {children}
        </motion.div>
      )}

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant || 'default'}
              className={cn(
                action.variant === 'default' && 'bg-gradient-to-r from-cosmic-blue to-cosmic-purple hover:from-cosmic-blue/90 hover:to-cosmic-purple/90',
                'shadow-lg hover:shadow-cosmic-blue/50 transition-all'
              )}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className="border-white/20 hover:border-cosmic-blue/50 hover:bg-cosmic-blue/10"
            >
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export function EmptyStateCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      'backdrop-blur-xl bg-white/5 dark:bg-black/10',
      'border border-white/10 dark:border-white/5',
      'rounded-xl p-6',
      className
    )}>
      {children}
    </div>
  );
}
