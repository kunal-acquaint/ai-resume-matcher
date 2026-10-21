import type {
  CreateJobRequest,
  Job,
  ListJobsQuery,
  UpdateJobRequest,
} from '@resume-matcher/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createJob, deleteJob, extractSkills, getJob, listJobs, updateJob } from './jobs-api';

/** How often a job is re-fetched while its skills are being extracted. */
export const EXTRACTION_POLL_MS = 2000;

export const jobKeys = {
  all: ['jobs'] as const,
  list: (query: ListJobsQuery) => ['jobs', 'list', query] as const,
  detail: (id: string) => ['jobs', 'detail', id] as const,
};

export function useJobs(query: ListJobsQuery) {
  return useQuery({
    queryKey: jobKeys.list(query),
    queryFn: () => listJobs(query),
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/** A job; polled while its skills are being extracted so the page updates by itself. */
export function useJob(id: string) {
  return useQuery({
    queryKey: jobKeys.detail(id),
    queryFn: () => getJob(id),
    refetchInterval: (query) =>
      query.state.data?.skillsStatus === 'extracting' ? EXTRACTION_POLL_MS : false,
  });
}

/** Stores a job returned by a mutation and marks every job list as stale. */
function useCacheJob() {
  const queryClient = useQueryClient();
  return (job: Job) => {
    queryClient.setQueryData(jobKeys.detail(job.id), job);
    void queryClient.invalidateQueries({ queryKey: [...jobKeys.all, 'list'] });
  };
}

export function useCreateJob() {
  const cacheJob = useCacheJob();
  return useMutation({
    mutationFn: (body: CreateJobRequest) => createJob(body),
    onSuccess: cacheJob,
  });
}

export function useUpdateJob(id: string) {
  const cacheJob = useCacheJob();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateJobRequest) => updateJob(id, body),
    onSuccess: (job) => {
      cacheJob(job);
      // Skill or description edits rescore the job's candidates.
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}

export function useExtractSkills(id: string) {
  const cacheJob = useCacheJob();
  return useMutation({ mutationFn: () => extractSkills(id), onSuccess: cacheJob });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: jobKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: jobKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['candidates'] });
    },
  });
}
