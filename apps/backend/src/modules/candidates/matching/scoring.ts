/** Number of best-matching resume chunks averaged into the semantic score (spec §5.2). */
export const TOP_K_CHUNKS = 3;

/** Mean of the `TOP_K_CHUNKS` highest chunk similarities (all of them if there are fewer). */
export function semanticRawScore(chunkSimilarities: readonly number[]): number {
  if (chunkSimilarities.length === 0) {
    return 0;
  }
  const top = chunkSimilarities.toSorted((a, b) => b - a).slice(0, TOP_K_CHUNKS);
  return top.reduce((sum, value) => sum + value, 0) / top.length;
}

/** Maps a raw similarity onto 0..1 using the calibrated floor/ceiling (spec §5.3). */
export function rescale(raw: number, floor: number, ceiling: number): number {
  return Math.min(1, Math.max(0, (raw - floor) / (ceiling - floor)));
}

export interface ScoreWeights {
  semantic: number;
  coverage: number;
}

export function hybridScore(
  semanticScore: number,
  coverage: number,
  weights: ScoreWeights,
): number {
  return weights.semantic * semanticScore + weights.coverage * coverage;
}
