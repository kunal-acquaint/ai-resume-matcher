import { escapeRegExp } from '../../../common/utils/escape-regexp.js';
import { lookupSkill } from './skills-dictionary.js';
import { containsTerm } from './term-matcher.js';

/** Longer words only need to share this many leading characters ("testing" ~ "test"). */
const WORD_STEM_LENGTH = 4;

function startsAWord(normalizedText: string, stem: string): boolean {
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(stem)}`).test(normalizedText);
}

/**
 * Whether a skill proposed by the LLM is actually mentioned in the job
 * description (spec §5.4). Small models sometimes add skills that are not in
 * the text; those are dropped. A skill counts as mentioned when its name or a
 * dictionary alias appears as a term, or when every word of its name appears,
 * allowing for different endings ("A/B Testing" in "A/B test analysis").
 * `normalizedText` must come from `normalizeForMatching`.
 */
export function isMentionedIn(normalizedText: string, skillName: string): boolean {
  const terms = [skillName, ...(lookupSkill(skillName)?.aliases ?? [])];
  if (terms.some((term) => containsTerm(normalizedText, term))) {
    return true;
  }
  const words = skillName.toLowerCase().split(/\s+/).filter(Boolean);
  return (
    words.length > 0 &&
    words.every((word) =>
      word.length <= WORD_STEM_LENGTH
        ? containsTerm(normalizedText, word)
        : startsAWord(normalizedText, word.slice(0, WORD_STEM_LENGTH)),
    )
  );
}
