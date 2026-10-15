import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SkillMatch } from '@resume-matcher/shared';
import type { Env } from '../../../config/env.schema.js';
import { dot } from '../../ai/embeddings/vector-math.js';
import { normalizeForMatching } from '../../ai/skills/term-matcher.js';
import { hybridScore, rescale, type ScoreWeights, semanticRawScore } from './scoring.js';
import { type EmbeddedPassage, matchSkills, type SkillToMatch } from './skill-matcher.js';

export interface JobForMatching {
  embedding: readonly number[];
  requiredSkills: readonly SkillToMatch[];
}

export interface MatchResult {
  /** Similarity of each chunk to the job, in chunk order. */
  chunkSimilarities: number[];
  semanticRaw: number;
  semanticScore: number;
  skillMatch: SkillMatch;
  coverage: number;
  finalScore: number;
}

/** Scores a resume against a job (spec §5.2–5.5). Pure computation, no I/O. */
@Injectable()
export class MatchingService {
  private readonly floor: number;
  private readonly ceiling: number;
  private readonly skillThreshold: number;
  private readonly weights: ScoreWeights;

  constructor(config: ConfigService<Env, true>) {
    this.floor = config.get('SIM_FLOOR', { infer: true });
    this.ceiling = config.get('SIM_CEILING', { infer: true });
    this.skillThreshold = config.get('SKILL_MATCH_THRESHOLD', { infer: true });
    this.weights = {
      semantic: config.get('SCORE_WEIGHT_SEMANTIC', { infer: true }),
      coverage: config.get('SCORE_WEIGHT_COVERAGE', { infer: true }),
    };
  }

  evaluate(
    job: JobForMatching,
    resumeText: string,
    chunks: readonly EmbeddedPassage[],
  ): MatchResult {
    const chunkSimilarities = chunks.map((chunk) => dot(chunk.embedding, job.embedding));
    const semanticRaw = semanticRawScore(chunkSimilarities);
    const semanticScore = rescale(semanticRaw, this.floor, this.ceiling);

    const skillMatch = matchSkills(
      normalizeForMatching(resumeText),
      chunks,
      job.requiredSkills,
      this.skillThreshold,
    );
    const total = skillMatch.matched.length + skillMatch.missing.length;
    const coverage = total === 0 ? 0 : skillMatch.matched.length / total;

    return {
      chunkSimilarities,
      semanticRaw,
      semanticScore,
      skillMatch,
      coverage,
      finalScore: hybridScore(semanticScore, coverage, this.weights),
    };
  }
}
