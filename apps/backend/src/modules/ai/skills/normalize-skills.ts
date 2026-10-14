import { JOB_LIMITS, type RequiredSkillInput } from '@resume-matcher/shared';
import { lookupSkill } from './skills-dictionary.js';

export interface NormalizedSkill {
  name: string;
  aliases: string[];
}

export interface NormalizeSkillsOptions {
  /**
   * Add aliases from the skill dictionary. Used for AI-extracted skills, not for
   * manual edits, so an alias the admin removed is not silently re-added.
   */
  enrichFromDictionary: boolean;
}

/**
 * Cleans a skill list: trims, drops blanks, merges case-insensitive duplicates
 * (combining their aliases), removes aliases equal to the name, and enforces
 * the limits in `JOB_LIMITS`. Order of first appearance is preserved.
 */
export function normalizeSkills(
  inputs: readonly RequiredSkillInput[],
  { enrichFromDictionary }: NormalizeSkillsOptions,
): NormalizedSkill[] {
  const byKey = new Map<string, { name: string; aliases: Map<string, string> }>();

  for (const input of inputs) {
    const name = input.name.trim().slice(0, JOB_LIMITS.skillNameMaxLength);
    if (!name) continue;

    const key = name.toLowerCase();
    const entry = byKey.get(key) ?? { name, aliases: new Map<string, string>() };
    byKey.set(key, entry);

    const dictionaryAliases = enrichFromDictionary ? (lookupSkill(name)?.aliases ?? []) : [];
    const dictionaryName = enrichFromDictionary ? lookupSkill(name)?.name : undefined;
    for (const alias of [...(input.aliases ?? []), ...dictionaryAliases, dictionaryName ?? '']) {
      const trimmed = alias.trim().slice(0, JOB_LIMITS.skillNameMaxLength);
      const aliasKey = trimmed.toLowerCase();
      if (trimmed && aliasKey !== key && !entry.aliases.has(aliasKey)) {
        entry.aliases.set(aliasKey, trimmed);
      }
    }
  }

  return [...byKey.values()].slice(0, JOB_LIMITS.maxSkills).map((entry) => ({
    name: entry.name,
    aliases: [...entry.aliases.values()].slice(0, JOB_LIMITS.maxAliasesPerSkill),
  }));
}
