import { HashingEmbedder } from './hashing-embedder.js';
import { dot } from './vector-math.js';

describe('HashingEmbedder', () => {
  const embedder = new HashingEmbedder();

  it('produces normalized vectors of the configured size, one per text', async () => {
    const vectors = await embedder.embed(['React and Node.js developer', 'Data analyst']);

    expect(vectors).toHaveLength(2);
    for (const vector of vectors) {
      expect(vector).toHaveLength(embedder.dimensions);
      expect(dot(vector, vector)).toBeCloseTo(1);
    }
  });

  it('is deterministic', async () => {
    const [a] = await embedder.embed(['TypeScript, React, MongoDB']);
    const [b] = await embedder.embed(['TypeScript, React, MongoDB']);

    expect(a).toEqual(b);
  });

  it('scores texts sharing keywords higher than unrelated texts', async () => {
    const [jd, related, unrelated] = await embedder.embed([
      'Senior developer with React, TypeScript, Node.js and MongoDB experience',
      'Built React and TypeScript frontends backed by Node.js and MongoDB',
      'Excel pivot tables, Power BI dashboards and retail sales reporting',
    ]);

    expect(dot(jd, related)).toBeGreaterThan(dot(jd, unrelated));
  });

  it('ignores case and stop words', async () => {
    const [a, b] = await embedder.embed(['The React developer', 'react DEVELOPER']);

    expect(dot(a, b)).toBeCloseTo(1);
  });

  it('approximates word-piece token counts', () => {
    expect(embedder.countTokens('one two three four five six seven eight nine ten')).toBe(13);
  });
});
