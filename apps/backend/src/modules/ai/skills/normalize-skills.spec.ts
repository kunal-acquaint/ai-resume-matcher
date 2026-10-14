import { JOB_LIMITS } from '@resume-matcher/shared';
import { normalizeSkills } from './normalize-skills.js';

describe('normalizeSkills', () => {
  it('trims, drops blanks and merges case-insensitive duplicates with their aliases', () => {
    const result = normalizeSkills(
      [
        { name: ' React ', aliases: ['ReactJS'] },
        { name: '   ' },
        { name: 'react', aliases: ['React.js', 'reactjs'] },
        { name: 'Docker' },
      ],
      { enrichFromDictionary: false },
    );

    expect(result).toEqual([
      { name: 'React', aliases: ['ReactJS', 'React.js'] },
      { name: 'Docker', aliases: [] },
    ]);
  });

  it('removes aliases that equal the skill name', () => {
    expect(
      normalizeSkills([{ name: 'AWS', aliases: ['aws', ' AWS ', 'Amazon Web Services'] }], {
        enrichFromDictionary: false,
      }),
    ).toEqual([{ name: 'AWS', aliases: ['Amazon Web Services'] }]);
  });

  it('adds dictionary aliases only when enrichment is enabled', () => {
    const input = [{ name: 'Node' }];

    expect(normalizeSkills(input, { enrichFromDictionary: false })).toEqual([
      { name: 'Node', aliases: [] },
    ]);
    expect(normalizeSkills(input, { enrichFromDictionary: true })).toEqual([
      { name: 'Node', aliases: ['NodeJS', 'Node.js'] },
    ]);
  });

  it('enforces the skill and alias limits', () => {
    const many = Array.from({ length: JOB_LIMITS.maxSkills + 5 }, (_skill, i) => ({
      name: `Skill ${i}`,
      aliases: Array.from({ length: 15 }, (_alias, j) => `alias ${i}-${j}`),
    }));

    const result = normalizeSkills(many, { enrichFromDictionary: false });

    expect(result).toHaveLength(JOB_LIMITS.maxSkills);
    expect(result[0]?.aliases).toHaveLength(JOB_LIMITS.maxAliasesPerSkill);
  });
});
