import type { Candidate, CandidateSummary, MatchedSkill } from '@resume-matcher/shared';
import type { CandidateDocument } from './schemas/candidate.schema.js';

/** Reads `{ _id, [key]: string }` from a populated reference; null if it wasn't populated or no longer exists. */
function populatedRef(value: unknown, key: 'title' | 'name'): { id: string; label: string } | null {
  if (typeof value !== 'object' || value === null || !('_id' in value)) {
    return null;
  }
  const label: unknown = Reflect.get(value, key);
  return typeof label === 'string' ? { id: String(value._id), label } : null;
}

/** List shape. Expects `jobId` populated with `title` and `uploadedBy` with `name`. */
export function toCandidateSummary(candidate: CandidateDocument): CandidateSummary {
  const job = populatedRef(candidate.jobId, 'title');
  const uploader = populatedRef(candidate.uploadedBy, 'name');
  const { matched, missing } = candidate.skillMatch;

  return {
    id: candidate.id,
    candidateName: candidate.candidateName,
    candidateEmail: candidate.candidateEmail,
    job: job ? { id: job.id, title: job.label } : null,
    fileName: candidate.fileName,
    finalScore: candidate.finalScore,
    semanticScore: candidate.semanticScore,
    coverage: candidate.coverage,
    matchedSkillCount: matched.length,
    requiredSkillCount: matched.length + missing.length,
    uploadedBy: uploader ? { id: uploader.id, name: uploader.label } : null,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString(),
  };
}

/** Detail shape, including the skill match evidence. */
export function toCandidateResponse(candidate: CandidateDocument): Candidate {
  return {
    ...toCandidateSummary(candidate),
    skillMatch: {
      matched: candidate.skillMatch.matched.map(
        ({ skill, evidence, term, similarity, passage }): MatchedSkill => ({
          skill,
          evidence,
          ...(term !== undefined && { term }),
          ...(similarity !== undefined && { similarity }),
          ...(passage !== undefined && { passage }),
        }),
      ),
      missing: [...candidate.skillMatch.missing],
    },
  };
}
