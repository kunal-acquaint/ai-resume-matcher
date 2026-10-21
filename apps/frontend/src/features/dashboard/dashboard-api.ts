import type { DashboardStats } from '@resume-matcher/shared';
import { api } from '@/lib/api/client';

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}
