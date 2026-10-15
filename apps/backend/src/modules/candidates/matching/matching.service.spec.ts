import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.schema.js';
import { MatchingService } from './matching.service.js';

describe('MatchingService', () => {
  const settings: Partial<Env> = {
    SIM_FLOOR: 0.2,
    SIM_CEILING: 0.8,
    SKILL_MATCH_THRESHOLD: 0.55,
    SCORE_WEIGHT_SEMANTIC: 0.6,
    SCORE_WEIGHT_COVERAGE: 0.4,
  };
  const config = { get: (key: keyof Env) => settings[key] } as unknown as ConfigService<Env, true>;
  const service = new MatchingService(config);

  it('combines semantic similarity and skill coverage into the final score', () => {
    const job = {
      embedding: [1, 0],
      requiredSkills: [
        { name: 'React', aliases: [], embedding: [] },
        { name: 'GraphQL', aliases: [], embedding: [] },
      ],
    };
    const chunks = [
      { text: 'React developer', embedding: [0.5, Math.sqrt(0.75)] }, // similarity 0.5
      { text: 'More React work', embedding: [1, 0] }, // similarity 1.0
    ];

    const result = service.evaluate(job, 'React developer. More React work.', chunks);

    expect(result.chunkSimilarities[0]).toBeCloseTo(0.5);
    expect(result.chunkSimilarities[1]).toBeCloseTo(1);
    expect(result.semanticRaw).toBeCloseTo(0.75);
    expect(result.semanticScore).toBeCloseTo((0.75 - 0.2) / 0.6);
    expect(result.skillMatch).toEqual({
      matched: [{ skill: 'React', evidence: 'text', term: 'React' }],
      missing: ['GraphQL'],
    });
    expect(result.coverage).toBe(0.5);
    expect(result.finalScore).toBeCloseTo(0.6 * ((0.75 - 0.2) / 0.6) + 0.4 * 0.5);
  });

  it('gives zero coverage when the job has no skills', () => {
    const result = service.evaluate({ embedding: [1, 0], requiredSkills: [] }, 'text', [
      { text: 'text', embedding: [1, 0] },
    ]);

    expect(result.coverage).toBe(0);
  });
});
