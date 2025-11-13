import { useEffect, useState, useCallback } from 'react';
import { performanceMonitor } from '@/utils/performance';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  timestamp: number;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { enabled = false, onMetrics } = options;
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  const handleMetrics = useCallback(
    (newMetrics: PerformanceMetrics) => {
      setMetrics(newMetrics);
      onMetrics?.(newMetrics);
    },
    [onMetrics]
  );

  useEffect(() => {
    if (!enabled) {
      performanceMonitor.stopFPSMonitoring();
      return;
    }

    performanceMonitor.startFPSMonitoring(handleMetrics);

    return () => {
      performanceMonitor.stopFPSMonitoring();
    };
  }, [enabled, handleMetrics]);

  return {
    metrics,
    averageFPS: performanceMonitor.getAverageFPS(),
  };
}

export function useRenderTracking(componentName: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    performanceMonitor.mark(`${componentName}-mount`);

    return () => {
      performanceMonitor.mark(`${componentName}-unmount`);
      performanceMonitor.measure(
        `${componentName}-lifetime`,
        `${componentName}-mount`,
        `${componentName}-unmount`
      );
    };
  }, [componentName, enabled]);
}
