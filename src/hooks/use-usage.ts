/**
 * Custom hook for LLM usage and cost data
 */
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import type { UsageStats } from '@/api-types';

export function useUsageStats(params?: {
  startDate?: string;
  endDate?: string;
  period?: '7d' | '30d' | '90d' | 'all';
}) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getUserUsageStats(params);

        if (mounted && response.success && response.data) {
          setStats(response.data.stats);
        } else if (!response.success) {
          const errorMsg = typeof response.error === 'string' ? response.error : (response.error?.message || 'Failed to fetch usage stats');
          setError(errorMsg);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch usage stats');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      mounted = false;
    };
  }, [params?.startDate, params?.endDate, params?.period]);

  return { stats, loading, error };
}

export function useTotalCost(params?: {
  startDate?: string;
  endDate?: string;
  period?: '7d' | '30d' | '90d' | 'all';
}) {
  const [totalCost, setTotalCost] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchCost = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.getUserTotalCost(params);

        if (mounted && response.success && response.data) {
          setTotalCost(response.data.totalCost);
        } else if (!response.success) {
          const errorMsg = typeof response.error === 'string' ? response.error : (response.error?.message || 'Failed to fetch total cost');
          setError(errorMsg);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch total cost');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCost();

    return () => {
      mounted = false;
    };
  }, [params?.startDate, params?.endDate, params?.period]);

  return { totalCost, loading, error };
}
