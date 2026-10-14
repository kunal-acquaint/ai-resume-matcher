export const JOB_STATUSES = ['active', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** `extracting`: AI skill extraction queued or running; `ready`: resumes can be matched. */
export const SKILLS_STATUSES = ['extracting', 'ready', 'failed'] as const;
export type SkillsStatus = (typeof SKILLS_STATUSES)[number];

export const JOB_LIMITS = {
  titleMaxLength: 120,
  descriptionMinLength: 50,
  descriptionMaxLength: 20_000,
  maxSkills: 30,
  skillNameMaxLength: 60,
  maxAliasesPerSkill: 10,
} as const;

export interface RequiredSkill {
  name: string;
  /** Alternative spellings that also count as a match, e.g. "NodeJS" for "Node.js". */
  aliases: string[];
  source: 'ai' | 'manual';
}

export interface Job {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  requiredSkills: RequiredSkill[];
  skillsStatus: SkillsStatus;
  candidateCount: number;
  /** Null when the creating admin has since been removed. */
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequiredSkillInput {
  name: string;
  aliases?: string[];
}

export interface CreateJobRequest {
  title: string;
  description: string;
}

export interface UpdateJobRequest {
  title?: string;
  description?: string;
  status?: JobStatus;
  /** Replaces the whole skill list; marks skills as ready. */
  requiredSkills?: RequiredSkillInput[];
}

export interface ListJobsQuery {
  status?: JobStatus;
  search?: string;
  page?: number;
  limit?: number;
}
