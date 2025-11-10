/**
 * n8n Health Check Service
 * Monitors the health and availability of the n8n instance
 */

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  lastChecked: number;
  details: {
    api: boolean;
    database: boolean;
    queue: boolean;
    webhooks: boolean;
  };
  message?: string;
}

export interface N8nConnectionConfig {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

/**
 * Service for checking n8n health and connectivity
 */
export class N8nHealthCheck {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private lastHealthStatus: HealthStatus | null = null;
  private lastCheckTime = 0;
  private readonly cacheValidityMs = 30000; // 30 seconds

  constructor(config: N8nConnectionConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 10000;
  }

  /**
   * Check overall health of n8n instance
   */
  async checkHealth(useCache = true): Promise<HealthStatus> {
    // Return cached result if still valid
    if (useCache && this.isCacheValid()) {
      return this.lastHealthStatus!;
    }

    const now = Date.now();
    const details = {
      api: false,
      database: false,
      queue: false,
      webhooks: false,
    };

    try {
      // Check API connectivity
      const apiCheck = await this.checkApiConnection();
      details.api = apiCheck.success;

      // Get version info
      const versionInfo = await this.getVersion();

      // Check database connectivity (via workflows endpoint)
      const dbCheck = await this.checkDatabase();
      details.database = dbCheck;

      // Check queue health (via executions endpoint)
      const queueCheck = await this.checkQueue();
      details.queue = queueCheck;

      // Check webhook functionality
      const webhookCheck = await this.checkWebhooks();
      details.webhooks = webhookCheck;

      // Determine overall status
      const allHealthy = Object.values(details).every(v => v);
      const someHealthy = Object.values(details).some(v => v);

      const status: HealthStatus = {
        status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
        version: versionInfo.version,
        uptime: versionInfo.uptime ?? 0,
        lastChecked: now,
        details,
        message: allHealthy
          ? 'All systems operational'
          : someHealthy
          ? 'Some systems experiencing issues'
          : 'n8n is not responding',
      };

      this.lastHealthStatus = status;
      this.lastCheckTime = now;

      return status;
    } catch (error) {
      const status: HealthStatus = {
        status: 'unhealthy',
        version: 'unknown',
        uptime: 0,
        lastChecked: now,
        details,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };

      this.lastHealthStatus = status;
      this.lastCheckTime = now;

      return status;
    }
  }

  /**
   * Check if n8n API is reachable
   */
  async checkConnection(): Promise<boolean> {
    try {
      const result = await this.checkApiConnection();
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get n8n version information
   */
  async getVersion(): Promise<{ version: string; uptime?: number }> {
    try {
      const response = await this.makeRequest('/settings');

      if (response.ok) {
        const data = await response.json() as { versionCli?: string; n8nVersion?: string };
        return {
          version: data.versionCli ?? data.n8nVersion ?? 'unknown',
        };
      }

      return { version: 'unknown' };
    } catch {
      return { version: 'unknown' };
    }
  }

  /**
   * Get workflow count
   */
  async getWorkflowCount(): Promise<number> {
    try {
      const response = await this.makeRequest('/workflows');

      if (response.ok) {
        const data = await response.json() as { data?: unknown[] };
        return data.data?.length ?? 0;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(): Promise<{
    total: number;
    running: number;
    failed: number;
    success: number;
  }> {
    try {
      const response = await this.makeRequest('/executions?limit=100');

      if (response.ok) {
        const data = await response.json() as {
          data?: Array<{ finished?: boolean; stoppedAt?: string; status?: string }>;
        };
        const executions = data.data ?? [];

        return {
          total: executions.length,
          running: executions.filter(e => !e.finished).length,
          failed: executions.filter(e => e.finished && e.status === 'error').length,
          success: executions.filter(e => e.finished && e.status === 'success').length,
        };
      }

      return { total: 0, running: 0, failed: 0, success: 0 };
    } catch {
      return { total: 0, running: 0, failed: 0, success: 0 };
    }
  }

  /**
   * Private: Check API connection
   */
  private async checkApiConnection(): Promise<{ success: boolean; latency: number }> {
    const startTime = Date.now();

    try {
      const response = await this.makeRequest('/settings', { method: 'GET' });
      const latency = Date.now() - startTime;

      return {
        success: response.ok,
        latency,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Private: Check database connectivity
   */
  private async checkDatabase(): Promise<boolean> {
    try {
      // Try to fetch workflows (requires DB access)
      const response = await this.makeRequest('/workflows?limit=1');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Private: Check queue health
   */
  private async checkQueue(): Promise<boolean> {
    try {
      // Try to fetch recent executions (requires queue access)
      const response = await this.makeRequest('/executions?limit=1');
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Private: Check webhook functionality
   */
  private async checkWebhooks(): Promise<boolean> {
    try {
      // Check if webhook routes are accessible
      const response = await fetch(`${this.apiUrl}/webhook-test`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeout),
      });

      // Webhook-test route should return 404 if webhooks are working
      // (since we don't have an actual test webhook registered)
      return response.status === 404 || response.status === 200;
    } catch {
      // If the route is completely unreachable, webhooks might be down
      return false;
    }
  }

  /**
   * Private: Make authenticated request to n8n API
   */
  private async makeRequest(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = `${this.apiUrl}${path.startsWith('/') ? '' : '/'}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    return response;
  }

  /**
   * Private: Check if cached health status is still valid
   */
  private isCacheValid(): boolean {
    if (!this.lastHealthStatus || !this.lastCheckTime) {
      return false;
    }

    return Date.now() - this.lastCheckTime < this.cacheValidityMs;
  }

  /**
   * Clear cached health status
   */
  clearCache(): void {
    this.lastHealthStatus = null;
    this.lastCheckTime = 0;
  }

  /**
   * Get last cached health status
   */
  getLastStatus(): HealthStatus | null {
    return this.lastHealthStatus;
  }
}

/**
 * Create a new N8nHealthCheck instance
 */
export function createN8nHealthCheck(config: N8nConnectionConfig): N8nHealthCheck {
  return new N8nHealthCheck(config);
}
