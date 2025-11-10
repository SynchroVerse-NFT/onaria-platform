import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Code2, Users, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
  gradient: string;
}

const AnimatedCounter: React.FC<{ value: number; duration?: number }> = ({ value, duration = 2000 }) => {
  const [count, setCount] = useState(0);
  const counterRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const startTime = Date.now();
    const endValue = value;

    const updateCounter = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(easeOutQuart * endValue);

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };

    updateCounter();
  }, [value, duration]);

  return <span ref={counterRef}>{count.toLocaleString()}</span>;
};

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, label, value, suffix, delay = 0, gradient }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        'relative overflow-hidden rounded-xl p-5 border border-border-primary backdrop-blur-sm',
        'bg-gradient-to-br',
        gradient
      )}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-white/10 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-sm font-medium text-white/90">{label}</h3>
        </div>
        <p className="text-3xl font-bold text-white">
          <AnimatedCounter value={value} />
          {suffix && <span className="text-xl ml-1">{suffix}</span>}
        </p>
      </div>

      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-16 -translate-y-16" />
    </motion.div>
  );
};

interface CommunityStatsBarProps {
  totalApps: number;
  totalDevelopers?: number;
  appsToday?: number;
  mostActiveCategory?: string;
  className?: string;
}

export const CommunityStatsBar: React.FC<CommunityStatsBarProps> = ({
  totalApps,
  totalDevelopers = 0,
  appsToday = 0,
  mostActiveCategory = 'AI',
  className
}) => {
  return (
    <div className={cn('mb-12', className)}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-accent" />
          Community Stats
        </h2>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Code2}
          label="Total Apps Built"
          value={totalApps}
          delay={0}
          gradient="from-blue-500/80 to-blue-600/80"
        />

        <StatCard
          icon={Users}
          label="Community Developers"
          value={totalDevelopers}
          delay={0.1}
          gradient="from-purple-500/80 to-purple-600/80"
        />

        <StatCard
          icon={TrendingUp}
          label="Apps Built Today"
          value={appsToday}
          delay={0.2}
          gradient="from-green-500/80 to-green-600/80"
        />

        <StatCard
          icon={Sparkles}
          label="Most Active Category"
          value={0}
          suffix={mostActiveCategory}
          delay={0.3}
          gradient="from-orange-500/80 to-orange-600/80"
        />
      </div>
    </div>
  );
};
