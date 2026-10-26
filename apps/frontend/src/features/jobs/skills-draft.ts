import { JOB_LIMITS, type RequiredSkillInput } from '@resume-matcher/shared';

/** One editable row of the skills editor. */
export interface DraftSkill {
  key: number;
  name: string;
  /** Comma-separated aliases as typed. */
  aliases: string;
}

let nextKey = 0;

export function toDraft(name = '', aliases: readonly string[] = []): DraftSkill {
  return { key: nextKey++, name, aliases: aliases.join(', ') };
}

/** Turns the draft rows into the API payload (blank rows dropped), or returns a validation message. */
export function validateDraft(draft: readonly DraftSkill[]): RequiredSkillInput[] | string {
  const skills = draft
    .map((row) => ({
      name: row.name.trim(),
      aliases: row.aliases
        .split(',')
        .map((alias) => alias.trim())
        .filter(Boolean),
    }))
    .filter((skill) => skill.name);

  if (skills.length === 0) {
    return 'Add at least one skill.';
  }
  if (skills.length > JOB_LIMITS.maxSkills) {
    return `A job can have at most ${JOB_LIMITS.maxSkills} skills.`;
  }
  const tooLong = [...skills.map((s) => s.name), ...skills.flatMap((s) => s.aliases)].find(
    (term) => term.length > JOB_LIMITS.skillNameMaxLength,
  );
  if (tooLong) {
    return `"${tooLong.slice(0, 20)}…" is longer than ${JOB_LIMITS.skillNameMaxLength} characters.`;
  }
  const tooManyAliases = skills.find((s) => s.aliases.length > JOB_LIMITS.maxAliasesPerSkill);
  if (tooManyAliases) {
    return `"${tooManyAliases.name}" has more than ${JOB_LIMITS.maxAliasesPerSkill} aliases.`;
  }
  return skills;
}
