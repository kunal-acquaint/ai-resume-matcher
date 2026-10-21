import type {
  CreateJobRequest,
  Job,
  ListJobsQuery,
  Paginated,
  UpdateJobRequest,
} from '@resume-matcher/shared';
import { api } from '@/lib/api/client';

export async function listJobs(query: ListJobsQuery): Promise<Paginated<Job>> {
  const { data } = await api.get<Paginated<Job>>('/jobs', { params: query });
  return data;
}

export async function getJob(id: string): Promise<Job> {
  const { data } = await api.get<Job>(`/jobs/${id}`);
  return data;
}

export async function createJob(body: CreateJobRequest): Promise<Job> {
  const { data } = await api.post<Job>('/jobs', body);
  return data;
}

export async function updateJob(id: string, body: UpdateJobRequest): Promise<Job> {
  const { data } = await api.patch<Job>(`/jobs/${id}`, body);
  return data;
}

export async function extractSkills(id: string): Promise<Job> {
  const { data } = await api.post<Job>(`/jobs/${id}/extract-skills`);
  return data;
}

export async function deleteJob(id: string): Promise<void> {
  await api.delete(`/jobs/${id}`);
}
