import type { MatchedSkill, SkillMatch } from '@resume-matcher/shared';
import { dot } from '../../ai/embeddings/vector-math.js';
import { findFirstTerm } from '../../ai/skills/term-matcher.js';

/** Longest resume passage stored as evidence for a semantic match. */
const MAX_PASSAGE_LENGTH = 300;

export interface SkillToMatch {
  name: string;
  aliases: readonly string[];
  embedding: readonly number[];
}

export interface EmbeddedPassage {
  text: string;
  embedding: readonly number[];
}

/**
 * Decides for each required skill whether the resume shows it (spec §5.5):
 * 1. its name or an alias appears in the text (word-bounded), else
 * 2. its embedding is close enough to some resume chunk, else
 * 3. it is missing.
 * `normalizedText` must come from `normalizeForMatching`.
 */
export function matchSkills(
  normalizedText: string,
  chunks: readonly EmbeddedPassage[],
  skills: readonly SkillToMatch[],
  semanticThreshold: number,
): SkillMatch {
  const matched: MatchedSkill[] = [];
  const missing: string[] = [];

  for (const skill of skills) {
    const term = findFirstTerm(normalizedText, [skill.name, ...skill.aliases]);
    if (term) {
      const isName = term.toLowerCase() === skill.name.toLowerCase();
      matched.push({ skill: skill.name, evidence: isName ? 'text' : 'alias', term });
      continue;
    }

    const best = bestPassage(skill.embedding, chunks);
    if (best && best.similarity >= semanticThreshold) {
      matched.push({
        skill: skill.name,
        evidence: 'semantic',
        similarity: best.similarity,
        passage: best.text.slice(0, MAX_PASSAGE_LENGTH),
      });
    } else {
      missing.push(skill.name);
    }
  }

  return { matched, missing };
}

function bestPassage(
  embedding: readonly number[],
  chunks: readonly EmbeddedPassage[],
): { text: string; similarity: number } | undefined {
  let best: { text: string; similarity: number } | undefined;
  for (const chunk of chunks) {
    // Vectors from different embedding models are not comparable.
    if (chunk.embedding.length !== embedding.length || embedding.length === 0) continue;
    const similarity = dot(embedding, chunk.embedding);
    if (!best || similarity > best.similarity) {
      best = { text: chunk.text, similarity };
    }
  }
  return best;
}
