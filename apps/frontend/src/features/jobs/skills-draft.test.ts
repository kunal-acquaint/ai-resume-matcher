import { JOB_LIMITS } from '@resume-matcher/shared';
import { toDraft, validateDraft } from './skills-draft';

describe('validateDraft', () => {
  it('trims names, splits comma-separated aliases and drops blank rows', () => {
    const result = validateDraft([
      toDraft('  React ', ['React.js', ' ReactJS ']),
      { ...toDraft('Node.js'), aliases: 'NodeJS, , Node' },
      toDraft('   '),
    ]);

    expect(result).toEqual([
      { name: 'React', aliases: ['React.js', 'ReactJS'] },
      { name: 'Node.js', aliases: ['NodeJS', 'Node'] },
    ]);
  });

  it('requires at least one skill', () => {
    expect(validateDraft([toDraft(' ')])).toBe('Add at least one skill.');
  });

  it('enforces the skill count, name length and alias limits', () => {
    const tooMany = Array.from({ length: JOB_LIMITS.maxSkills + 1 }, (_row, i) =>
      toDraft(`Skill ${i}`),
    );
    const longName = [toDraft('x'.repeat(JOB_LIMITS.skillNameMaxLength + 1))];
    const manyAliases = [
      toDraft(
        'React',
        Array.from({ length: JOB_LIMITS.maxAliasesPerSkill + 1 }, (_alias, i) => `alias ${i}`),
      ),
    ];

    expect(validateDraft(tooMany)).toMatch(/at most 30 skills/);
    expect(validateDraft(longName)).toMatch(/longer than 60 characters/);
    expect(validateDraft(manyAliases)).toMatch(/more than 10 aliases/);
  });
});
