export const CANDIDATE_LIMITS = {
  nameMaxLength: 100,
  /** Maximum resume file size in bytes (5 MB). */
  maxFileSize: 5 * 1024 * 1024,
} as const;

export const CANDIDATE_SORTS = ['date', 'score'] as const;
export type CandidateSort = (typeof CANDIDATE_SORTS)[number];

/** How a required skill was found in the resume (spec §5.5). */
export type SkillEvidence = 'text' | 'alias' | 'semantic';

export interface MatchedSkill {
  skill: string;
  evidence: SkillEvidence;
  /** The skill name or alias found in the resume (text/alias evidence). */
  term?: string;
  /** Similarity between the skill and the best resume passage (semantic evidence). */
  similarity?: number;
  /** The resume passage that matched (semantic evidence). */
  passage?: string;
}

export interface SkillMatch {
  matched: MatchedSkill[];
  missing: string[];
}

/** A candidate as shown in lists (dashboard table, job page). Scores are 0..1. */
export interface CandidateSummary {
  id: string;
  candidateName: string;
  candidateEmail: string | null;
  /** Null only if the job was deleted concurrently. */
  job: { id: string; title: string } | null;
  fileName: string;
  finalScore: number;
  semanticScore: number;
  coverage: number;
  matchedSkillCount: number;
  requiredSkillCount: number;
  /** Null when the uploading admin has since been removed. */
  uploadedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Candidate extends CandidateSummary {
  skillMatch: SkillMatch;
}

export interface ListCandidatesQuery {
  jobId?: string;
  search?: string;
  sort?: CandidateSort;
  page?: number;
  limit?: number;
}

/** Multipart text fields sent with the resume file (field name `file`). */
export interface UploadCandidateFields {
  candidateName: string;
  candidateEmail?: string;
}
