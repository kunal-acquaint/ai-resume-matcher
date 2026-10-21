import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from './dashboard-api';

export const dashboardKeys = { stats: ['dashboard', 'stats'] as const };

export function useDashboardStats() {
  return useQuery({ queryKey: dashboardKeys.stats, queryFn: getDashboardStats });
}
