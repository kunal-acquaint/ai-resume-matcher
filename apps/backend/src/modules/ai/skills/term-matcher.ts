import { escapeRegExp } from '../../../common/utils/escape-regexp.js';

/** Characters that count as part of a term, so "Java" does not match inside "JavaScript". */
const TERM_CHAR = '[a-z0-9+#]';
/**
 * A term may not start right after a "." either, so "JS" does not match inside "Node.js".
 * A trailing "." still ends a term ("...with React." matches "React").
 */
const BEFORE_TERM = '[a-z0-9+#.]';

const patternCache = new Map<string, RegExp>();

function patternFor(term: string): RegExp {
  const normalized = normalizeForMatching(term);
  let pattern = patternCache.get(normalized);
  if (!pattern) {
    const body = escapeRegExp(normalized).replace(/ /g, '\\s+');
    pattern = new RegExp(`(?<!${BEFORE_TERM})${body}(?!${TERM_CHAR})`);
    patternCache.set(normalized, pattern);
  }
  return pattern;
}

/** Lowercases and collapses whitespace; apply once to a document before matching many terms. */
export function normalizeForMatching(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Case-insensitive, word-bounded search for a term (spec §5.5).
 * `normalizedText` must come from `normalizeForMatching`.
 */
export function containsTerm(normalizedText: string, term: string): boolean {
  return term.trim().length > 0 && patternFor(term).test(normalizedText);
}

/** Returns the first of `terms` found in the text, or undefined. */
export function findFirstTerm(
  normalizedText: string,
  terms: readonly string[],
): string | undefined {
  return terms.find((term) => containsTerm(normalizedText, term));
}
