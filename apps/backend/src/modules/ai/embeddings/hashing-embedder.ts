import { normalize } from './vector-math.js';
import type { TextEmbedder } from './text-embedder.js';

const DIMENSIONS = 384;

/** Rough ratio of word-piece tokens to words, so chunk sizes resemble MiniLM's. */
const TOKENS_PER_WORD = 1.3;

const STOP_WORDS = new Set(
  (
    'a an and are as at be been but by can for from has have i in into is it its of on or our ' +
    'that the their they this to was we were will with you your'
  ).split(' '),
);

/** FNV-1a 32-bit hash. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9+#]+(?:\.[a-z0-9]+)*/g) ?? [];
}

/**
 * Stand-in embedder (`AI_PROVIDER=stub`): a hashed bag-of-words vector.
 * Similarity between two vectors reflects their shared words, i.e. keyword
 * overlap, with the same interface and dimensions as the real model. It is
 * deterministic and needs no model download.
 */
export class HashingEmbedder implements TextEmbedder {
  readonly model = 'hashing-stub';
  readonly dimensions = DIMENSIONS;

  embed(texts: string[]): Promise<number[][]> {
    return Promise.resolve(texts.map((text) => this.embedOne(text)));
  }

  countTokens(text: string): number {
    return Math.ceil(words(text).length * TOKENS_PER_WORD);
  }

  private embedOne(text: string): number[] {
    const vector = Array.from({ length: DIMENSIONS }, () => 0);
    for (const word of words(text)) {
      if (!STOP_WORDS.has(word)) {
        vector[hash(word) % DIMENSIONS] += 1;
      }
    }
    return normalize(vector);
  }
}
