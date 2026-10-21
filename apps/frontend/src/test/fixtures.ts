import type { Candidate, CandidateSummary, Job, Paginated, User } from '@resume-matcher/shared';

export const ME: User = {
  id: 'u-me',
  name: 'Alice Admin',
  email: 'alice@example.com',
  lastLoginAt: '2026-10-15T08:00:00.000Z',
  createdAt: '2026-10-01T00:00:00.000Z',
};

export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    title: 'Senior Full-Stack Developer',
    description:
      'Build web apps with React and TypeScript, and REST APIs with Node.js and MongoDB.',
    status: 'active',
    requiredSkills: [
      { name: 'React', aliases: ['React.js', 'ReactJS'], source: 'ai' },
      { name: 'Node.js', aliases: ['NodeJS'], source: 'ai' },
    ],
    skillsStatus: 'ready',
    candidateCount: 0,
    createdBy: { id: ME.id, name: ME.name },
    createdAt: '2026-10-10T09:00:00.000Z',
    updatedAt: '2026-10-10T09:00:00.000Z',
    ...overrides,
  };
}

export function makeCandidateSummary(overrides: Partial<CandidateSummary> = {}): CandidateSummary {
  return {
    id: 'cand-1',
    candidateName: 'Aarav Mehta',
    candidateEmail: 'aarav@example.com',
    job: { id: 'job-1', title: 'Senior Full-Stack Developer' },
    fileName: 'aarav.pdf',
    finalScore: 0.82,
    semanticScore: 0.75,
    coverage: 0.9,
    matchedSkillCount: 9,
    requiredSkillCount: 10,
    uploadedBy: { id: ME.id, name: ME.name },
    createdAt: '2026-10-14T10:00:00.000Z',
    updatedAt: '2026-10-14T10:00:00.000Z',
    ...overrides,
  };
}

export function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    ...makeCandidateSummary(),
    matchedSkillCount: 3,
    requiredSkillCount: 4,
    skillMatch: {
      matched: [
        { skill: 'TypeScript', evidence: 'text', term: 'TypeScript' },
        { skill: 'React', evidence: 'alias', term: 'ReactJS' },
        {
          skill: 'Kubernetes',
          evidence: 'semantic',
          similarity: 0.71,
          passage: 'Orchestrated container clusters in production',
        },
      ],
      missing: ['GraphQL'],
    },
    ...overrides,
  };
}

export function page<T>(items: T[], overrides: Partial<Paginated<T>> = {}): Paginated<T> {
  return { items, total: items.length, page: 1, limit: 10, ...overrides };
}
