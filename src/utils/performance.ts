import React from 'react';

type PerformanceMarkName = string;
type PerformanceMeasureName = string;

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();
  private fpsHistory: number[] = [];
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private isMonitoring = false;
  private rafId: number | null = null;

  mark(name: PerformanceMarkName): void {
    if (typeof performance === 'undefined' || !performance.mark) return;

    try {
      performance.mark(name);
      this.marks.set(name, performance.now());
    } catch (error) {
      console.warn(`Failed to create performance mark: ${name}`, error);
    }
  }

  measure(
    name: PerformanceMeasureName,
    startMark: PerformanceMarkName,
    endMark?: PerformanceMarkName
  ): number | null {
    if (typeof performance === 'undefined' || !performance.measure) return null;

    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }

      const entries = performance.getEntriesByName(name, 'measure');
      if (entries.length > 0) {
        const duration = entries[entries.length - 1].duration;
        this.measures.set(name, duration);
        return duration;
      }
    } catch (error) {
      console.warn(`Failed to create performance measure: ${name}`, error);
    }

    return null;
  }

  getMeasure(name: PerformanceMeasureName): number | undefined {
    return this.measures.get(name);
  }

  clearMarks(name?: PerformanceMarkName): void {
    if (typeof performance === 'undefined' || !performance.clearMarks) return;

    try {
      if (name) {
        performance.clearMarks(name);
        this.marks.delete(name);
      } else {
        performance.clearMarks();
        this.marks.clear();
      }
    } catch (error) {
      console.warn('Failed to clear performance marks', error);
    }
  }

  clearMeasures(name?: PerformanceMeasureName): void {
    if (typeof performance === 'undefined' || !performance.clearMeasures) return;

    try {
      if (name) {
        performance.clearMeasures(name);
        this.measures.delete(name);
      } else {
        performance.clearMeasures();
        this.measures.clear();
      }
    } catch (error) {
      console.warn('Failed to clear performance measures', error);
    }
  }

  startFPSMonitoring(callback?: (metrics: PerformanceMetrics) => void): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;

    const measureFrame = () => {
      if (!this.isMonitoring) return;

      const now = performance.now();
      const frameTime = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.frameCount++;

      const fps = 1000 / frameTime;
      this.fpsHistory.push(fps);

      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }

      if (callback && this.frameCount % 60 === 0) {
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        callback({
          fps: Math.round(avgFps),
          frameTime: Math.round(frameTime * 100) / 100,
          timestamp: now,
        });
      }

      this.rafId = requestAnimationFrame(measureFrame);
    };

    this.rafId = requestAnimationFrame(measureFrame);
  }

  stopFPSMonitoring(): void {
    this.isMonitoring = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.fpsHistory = [];
    this.frameCount = 0;
  }

  getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const avg = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    return Math.round(avg);
  }

  getPerformanceEntries(type?: string): PerformanceEntryList {
    if (typeof performance === 'undefined' || !performance.getEntries) return [];

    try {
      if (type) {
        return performance.getEntriesByType(type);
      }
      return performance.getEntries();
    } catch (error) {
      console.warn('Failed to get performance entries', error);
      return [];
    }
  }

  logMetrics(): void {
    console.group('Performance Metrics');

    if (this.marks.size > 0) {
      console.group('Marks');
      this.marks.forEach((time, name) => {
        console.log(`${name}: ${time.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    if (this.measures.size > 0) {
      console.group('Measures');
      this.measures.forEach((duration, name) => {
        console.log(`${name}: ${duration.toFixed(2)}ms`);
      });
      console.groupEnd();
    }

    if (this.fpsHistory.length > 0) {
      console.log(`Average FPS: ${this.getAverageFPS()}`);
    }

    console.groupEnd();
  }

  reset(): void {
    this.clearMarks();
    this.clearMeasures();
    this.stopFPSMonitoring();
  }
}

export const performanceMonitor = new PerformanceMonitor();

export function measureRenderTime<T extends (...args: unknown[]) => unknown>(
  name: string,
  fn: T
): T {
  return ((...args: unknown[]) => {
    performanceMonitor.mark(`${name}-start`);
    const result = fn(...args);
    performanceMonitor.mark(`${name}-end`);
    performanceMonitor.measure(name, `${name}-start`, `${name}-end`);
    return result;
  }) as T;
}

export async function measureAsyncRenderTime<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  performanceMonitor.mark(`${name}-start`);
  const result = await fn();
  performanceMonitor.mark(`${name}-end`);
  performanceMonitor.measure(name, `${name}-start`, `${name}-end`);
  return result;
}

export function withPerformanceTracking<P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props: P) => {
    performanceMonitor.mark(`${componentName}-render-start`);
    const element = React.createElement(Component, props);
    performanceMonitor.mark(`${componentName}-render-end`);
    performanceMonitor.measure(
      `${componentName}-render`,
      `${componentName}-render-start`,
      `${componentName}-render-end`
    );
    return element;
  };

  WrappedComponent.displayName = `withPerformanceTracking(${componentName})`;
  return WrappedComponent;
}
