/** Turns text into vectors. Implemented by the hashing stand-in and (later) MiniLM. */
export interface TextEmbedder {
  /** Identifier stored alongside results, e.g. "hashing-stub" or "Xenova/all-MiniLM-L6-v2". */
  readonly model: string;
  readonly dimensions: number;
  /** Returns one L2-normalized vector per input text. */
  embed(texts: string[]): Promise<number[][]>;
  /** Token count as seen by this embedder, used to size chunks. */
  countTokens(text: string): number;
}

export const TEXT_EMBEDDER = Symbol('TEXT_EMBEDDER');
