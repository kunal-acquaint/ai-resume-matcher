import { DictionarySkillExtractor } from './dictionary-skill-extractor.js';

describe('DictionarySkillExtractor', () => {
  const extractor = new DictionarySkillExtractor(0);

  it('returns dictionary skills mentioned in the job description, in order of appearance', async () => {
    const skills = await extractor.extract(
      'We need a developer strong in TypeScript and ReactJS, with Node.js APIs on AWS. ' +
        'Experience with Docker is a plus.',
    );

    expect(skills.map((s) => s.name)).toEqual(['TypeScript', 'React', 'Node.js', 'AWS', 'Docker']);
    expect(skills.find((s) => s.name === 'React')?.aliases).toContain('ReactJS');
  });

  it('does not report Java for a JavaScript-only description', async () => {
    const skills = await extractor.extract('Frontend role focused on modern JavaScript.');

    expect(skills.map((s) => s.name)).toEqual(['JavaScript']);
  });

  it('returns nothing when no known skill is mentioned', async () => {
    await expect(
      extractor.extract('Friendly team, flexible hours, great coffee.'),
    ).resolves.toEqual([]);
  });

  it('waits for the configured delay', async () => {
    const slow = new DictionarySkillExtractor(50);
    const startedAt = performance.now();

    await slow.extract('React');

    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(45);
  });
});
