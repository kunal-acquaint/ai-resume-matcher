import type {
  Candidate,
  CandidateSummary,
  ListCandidatesQuery,
  Paginated,
  UploadCandidateFields,
} from '@resume-matcher/shared';
import { api } from '@/lib/api/client';

export async function listCandidates(
  query: ListCandidatesQuery,
): Promise<Paginated<CandidateSummary>> {
  const { data } = await api.get<Paginated<CandidateSummary>>('/candidates', { params: query });
  return data;
}

export async function getCandidate(id: string): Promise<Candidate> {
  const { data } = await api.get<Candidate>(`/candidates/${id}`);
  return data;
}

export async function deleteCandidate(id: string): Promise<void> {
  await api.delete(`/candidates/${id}`);
}

export interface UploadResumeInput extends UploadCandidateFields {
  file: File;
}

/** Uploads one PDF resume for a job; the response already contains the final score. */
export async function uploadResume(jobId: string, input: UploadResumeInput): Promise<Candidate> {
  const form = new FormData();
  form.append('candidateName', input.candidateName);
  if (input.candidateEmail) form.append('candidateEmail', input.candidateEmail);
  form.append('file', input.file);
  const { data } = await api.post<Candidate>(`/jobs/${jobId}/candidates`, form);
  return data;
}
