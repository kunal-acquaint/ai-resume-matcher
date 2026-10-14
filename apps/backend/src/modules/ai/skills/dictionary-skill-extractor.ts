import { setTimeout as sleep } from 'node:timers/promises';
import { JOB_LIMITS, type RequiredSkillInput } from '@resume-matcher/shared';
import type { SkillExtractor } from './skill-extractor.js';
import { SKILLS_DICTIONARY } from './skills-dictionary.js';
import { findFirstTerm, normalizeForMatching } from './term-matcher.js';

/**
 * Stand-in extractor (`AI_PROVIDER=stub`): returns the dictionary skills whose
 * name or alias appears in the job description, in order of first appearance.
 * The optional delay imitates the real LLM so the UI's "extracting" state is visible.
 */
export class DictionarySkillExtractor implements SkillExtractor {
  readonly model = 'dictionary-stub';

  constructor(private readonly delayMs: number) {}

  async extract(jobDescription: string): Promise<RequiredSkillInput[]> {
    if (this.delayMs > 0) {
      await sleep(this.delayMs);
    }
    const text = normalizeForMatching(jobDescription);

    return SKILLS_DICTIONARY.flatMap((skill) => {
      const term = findFirstTerm(text, [skill.name, ...skill.aliases]);
      return term ? [{ skill, position: text.indexOf(term.toLowerCase()) }] : [];
    })
      .toSorted((a, b) => a.position - b.position)
      .slice(0, JOB_LIMITS.maxSkills)
      .map(({ skill }) => ({ name: skill.name, aliases: [...skill.aliases] }));
  }
}
