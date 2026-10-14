import type { RequiredSkillInput } from '@resume-matcher/shared';

/** Extracts the required skills from a job description (spec §5.4, task 1). */
export interface SkillExtractor {
  readonly model: string;
  extract(jobDescription: string): Promise<RequiredSkillInput[]>;
}

export const SKILL_EXTRACTOR = Symbol('SKILL_EXTRACTOR');
