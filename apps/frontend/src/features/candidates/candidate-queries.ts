import type { ListCandidatesQuery } from '@resume-matcher/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteCandidate,
  getCandidate,
  listCandidates,
  uploadResume,
  type UploadResumeInput,
} from './candidates-api';

export const candidateKeys = {
  all: ['candidates'] as const,
  list: (query: ListCandidatesQuery) => ['candidates', 'list', query] as const,
  detail: (id: string) => ['candidates', 'detail', id] as const,
};

/** Data that changes whenever a candidate is added or removed. */
const AFFECTED_BY_CANDIDATE_CHANGES = [candidateKeys.all, ['dashboard'], ['jobs']] as const;

export function useCandidates(query: ListCandidatesQuery) {
  return useQuery({
    queryKey: candidateKeys.list(query),
    queryFn: () => listCandidates(query),
    placeholderData: keepPreviousData,
  });
}

export function useCandidate(id: string) {
  return useQuery({ queryKey: candidateKeys.detail(id), queryFn: () => getCandidate(id) });
}

function useInvalidateAfterCandidateChange() {
  const queryClient = useQueryClient();
  return () => {
    for (const queryKey of AFFECTED_BY_CANDIDATE_CHANGES) {
      void queryClient.invalidateQueries({ queryKey });
    }
  };
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterCandidateChange();
  return useMutation({
    mutationFn: ({ jobId, ...input }: UploadResumeInput & { jobId: string }) =>
      uploadResume(jobId, input),
    onSuccess: (candidate) => {
      queryClient.setQueryData(candidateKeys.detail(candidate.id), candidate);
      invalidate();
    },
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAfterCandidateChange();
  return useMutation({
    mutationFn: (id: string) => deleteCandidate(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: candidateKeys.detail(id) });
      invalidate();
    },
  });
}
