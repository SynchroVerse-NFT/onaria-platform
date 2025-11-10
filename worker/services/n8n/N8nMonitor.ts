/**
 * n8n Monitoring Service
 * Monitors workflow executions, errors, and performance metrics
 */

import type { N8nHealthCheck, HealthStatus } from './N8nHealthCheck';

export interface ExecutionMetrics {
  totalExecutions: number;
  runningExecutions: number;
  failedExecutions: number;
  successfulExecutions: number;
  averageExecutionTime: number;
  errorRate: number;
}

export interface QueueMetrics {
  queueSize: number;
  waitingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface PerformanceMetrics {
  responseTime: number;
  cpuUsage?: number;
  memoryUsage?: number;
  uptime: number;
}

export interface MonitoringAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: 'execution_failure' | 'high_error_rate' | 'queue_backup' | 'health_degraded' | 'api_down';
  message: string;
  details: Record<string, unknown>;
  timestamp: number;
}

export interface MonitoringConfig {
  apiUrl: string;
  apiKey: string;
  checkInterval?: number; // ms
  alertThresholds?: {
    errorRate?: number; // percentage
    queueSize?: number;
    responseTime?: number; // ms
  };
}

/**
 * Service for monitoring n8n instance health and performance
 */
export class N8nMonitor {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly checkInterval: number;
  private readonly alertThresholds: Required<MonitoringConfig['alertThresholds']>;
  private healthCheck: N8nHealthCheck;
  private monitoringInterval: number | null = null;
  private alerts: MonitoringAlert[] = [];
  private readonly maxAlerts = 100;

  constructor(config: MonitoringConfig, healthCheck: N8nHealthCheck) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.checkInterval = config.checkInterval ?? 60000; // 1 minute default
    this.healthCheck = healthCheck;

    // Set default thresholds
    this.alertThresholds = {
      errorRate: config.alertThresholds?.errorRate ?? 10, // 10% error rate
      queueSize: config.alertThresholds?.queueSize ?? 100,
      responseTime: config.alertThresholds?.responseTime ?? 5000, // 5 seconds
    };
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(onAlert?: (alert: MonitoringAlert) => void): void {
    if (this.monitoringInterval) {
      console.warn('Monitoring already started');
      return;
    }

    console.log(`Starting n8n monitoring with ${this.checkInterval}ms interval`);

    // Initial check
    this.performHealthCheck(onAlert);

    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck(onAlert);
    }, this.checkInterval) as unknown as number;
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('n8n monitoring stopped');
    }
  }

  /**
   * Perform a single health check and generate alerts
   */
  private async performHealthCheck(onAlert?: (alert: MonitoringAlert) => void): Promise<void> {
    try {
      // Get health status
      const health = await this.healthCheck.checkHealth(false);

      // Check for health issues
      if (health.status === 'unhealthy') {
        this.createAlert(
          'critical',
          'health_degraded',
          'n8n instance is unhealthy',
          { health },
          onAlert
        );
      } else if (health.status === 'degraded') {
        this.createAlert(
          'warning',
          'health_degraded',
          'n8n instance is degraded',
          { health },
          onAlert
        );
      }

      // Check API connectivity
      if (!health.details.api) {
        this.createAlert(
          'critical',
          'api_down',
          'n8n API is not responding',
          { health },
          onAlert
        );
      }

      // Get execution metrics
      const executionStats = await this.healthCheck.getExecutionStats();
      const errorRate = executionStats.total > 0
        ? (executionStats.failed / executionStats.total) * 100
        : 0;

      // Check error rate
      if (errorRate > this.alertThresholds.errorRate && executionStats.total > 10) {
        this.createAlert(
          'error',
          'high_error_rate',
          `High error rate detected: ${errorRate.toFixed(2)}%`,
          { executionStats, errorRate },
          onAlert
        );
      }

      // Check for execution failures
      if (executionStats.failed > 0) {
        this.createAlert(
          'warning',
          'execution_failure',
          `${executionStats.failed} workflow execution(s) failed`,
          { executionStats },
          onAlert
        );
      }

    } catch (error) {
      this.createAlert(
        'error',
        'api_down',
        `Monitoring check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { error: error instanceof Error ? error.message : String(error) },
        onAlert
      );
    }
  }

  /**
   * Get execution metrics
   */
  async getExecutionMetrics(hours = 24): Promise<ExecutionMetrics> {
    try {
      const stats = await this.healthCheck.getExecutionStats();

      return {
        totalExecutions: stats.total,
        runningExecutions: stats.running,
        failedExecutions: stats.failed,
        successfulExecutions: stats.success,
        averageExecutionTime: 0, // n8n API doesn't provide this easily
        errorRate: stats.total > 0 ? (stats.failed / stats.total) * 100 : 0,
      };
    } catch (error) {
      console.error('Failed to get execution metrics:', error);
      return {
        totalExecutions: 0,
        runningExecutions: 0,
        failedExecutions: 0,
        successfulExecutions: 0,
        averageExecutionTime: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const health = await this.healthCheck.checkHealth(false);

      return {
        responseTime: 0, // Would need to measure this during health check
        uptime: health.uptime,
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        responseTime: 0,
        uptime: 0,
      };
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 50): MonitoringAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: MonitoringAlert['severity']): MonitoringAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): {
    isRunning: boolean;
    checkInterval: number;
    alertCount: number;
    lastCheck: number;
  } {
    return {
      isRunning: this.monitoringInterval !== null,
      checkInterval: this.checkInterval,
      alertCount: this.alerts.length,
      lastCheck: this.healthCheck.getLastStatus()?.lastChecked ?? 0,
    };
  }

  /**
   * Check if n8n is healthy (based on last check)
   */
  isHealthy(): boolean {
    const lastStatus = this.healthCheck.getLastStatus();
    return lastStatus?.status === 'healthy';
  }

  /**
   * Get health summary
   */
  async getHealthSummary(): Promise<{
    status: HealthStatus;
    metrics: ExecutionMetrics;
    recentAlerts: MonitoringAlert[];
  }> {
    const status = await this.healthCheck.checkHealth();
    const metrics = await this.getExecutionMetrics();
    const recentAlerts = this.getRecentAlerts(10);

    return {
      status,
      metrics,
      recentAlerts,
    };
  }

  /**
   * Create and store an alert
   */
  private createAlert(
    severity: MonitoringAlert['severity'],
    type: MonitoringAlert['type'],
    message: string,
    details: Record<string, unknown>,
    onAlert?: (alert: MonitoringAlert) => void
  ): void {
    const alert: MonitoringAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      severity,
      type,
      message,
      details,
      timestamp: Date.now(),
    };

    // Add to alerts array
    this.alerts.push(alert);

    // Maintain max alerts limit
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    // Log alert
    const logLevel = severity === 'critical' || severity === 'error' ? 'error' : 'warn';
    console[logLevel](`[n8n Monitor] ${severity.toUpperCase()}: ${message}`, details);

    // Call callback if provided
    if (onAlert) {
      try {
        onAlert(alert);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    }
  }

  /**
   * Send alert via webhook
   */
  async sendAlertWebhook(
    webhookUrl: string,
    alert: MonitoringAlert
  ): Promise<boolean> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          source: 'n8n-monitor',
        }),
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send alert webhook:', error);
      return false;
    }
  }
}

/**
 * Create a new N8nMonitor instance
 */
export function createN8nMonitor(
  config: MonitoringConfig,
  healthCheck: N8nHealthCheck
): N8nMonitor {
  return new N8nMonitor(config, healthCheck);
}
