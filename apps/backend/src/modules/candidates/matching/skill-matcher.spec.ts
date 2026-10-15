import { normalizeForMatching } from '../../ai/skills/term-matcher.js';
import { matchSkills, type SkillToMatch } from './skill-matcher.js';

const skill = (name: string, aliases: string[] = [], embedding: number[] = []): SkillToMatch => ({
  name,
  aliases,
  embedding,
});

describe('matchSkills', () => {
  const text = normalizeForMatching(
    'Built SPAs with ReactJS and TypeScript. Backend in Node.js. Deployed containers to Amazon Web Services.',
  );

  it('matches by skill name, then by alias, recording the term found', () => {
    const result = matchSkills(
      text,
      [],
      [
        skill('TypeScript'),
        skill('React', ['React.js', 'ReactJS']),
        skill('AWS', ['Amazon Web Services']),
      ],
      0.55,
    );

    expect(result.matched).toEqual([
      { skill: 'TypeScript', evidence: 'text', term: 'TypeScript' },
      // "React" is not a whole word inside "ReactJS", so the alias is what matches.
      { skill: 'React', evidence: 'alias', term: 'ReactJS' },
      { skill: 'AWS', evidence: 'alias', term: 'Amazon Web Services' },
    ]);
    expect(result.missing).toEqual([]);
  });

  it('reports skills that are not found as missing, keeping their order', () => {
    const result = matchSkills(text, [], [skill('Java'), skill('GraphQL'), skill('Node.js')], 0.55);

    expect(result.matched.map((m) => m.skill)).toEqual(['Node.js']);
    expect(result.missing).toEqual(['Java', 'GraphQL']);
  });

  it('falls back to semantic similarity with the best passage as evidence', () => {
    const chunks = [
      { text: 'Unrelated passage about hobbies', embedding: [0, 1] },
      { text: 'Orchestrated clusters of containers in production', embedding: [1, 0] },
    ];

    const result = matchSkills(text, chunks, [skill('Kubernetes', [], [0.8, 0.6])], 0.55);

    expect(result.matched).toEqual([
      {
        skill: 'Kubernetes',
        evidence: 'semantic',
        similarity: expect.closeTo(0.8, 5) as number,
        passage: 'Orchestrated clusters of containers in production',
      },
    ]);
  });

  it('treats a semantic similarity below the threshold as missing', () => {
    const chunks = [{ text: 'Something else', embedding: [1, 0] }];

    const result = matchSkills(text, chunks, [skill('Kubernetes', [], [0.5, 0.866])], 0.55);

    expect(result.missing).toEqual(['Kubernetes']);
  });

  it('skips semantic matching for embeddings of different sizes (different models)', () => {
    const chunks = [{ text: 'Passage', embedding: [1, 0, 0] }];

    const result = matchSkills(text, chunks, [skill('Kubernetes', [], [1, 0])], 0.1);

    expect(result.missing).toEqual(['Kubernetes']);
  });
});
