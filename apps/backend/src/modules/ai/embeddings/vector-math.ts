/** Dot product. For L2-normalized vectors this equals cosine similarity. */
export function dot(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/** Scales a vector to unit length. A zero vector is returned unchanged. */
export function normalize(vector: readonly number[]): number[] {
  const length = Math.sqrt(dot(vector, vector));
  return length === 0 ? [...vector] : vector.map((value) => value / length);
}

/** Element-wise mean of equally sized vectors, re-normalized to unit length. */
export function meanVector(vectors: readonly (readonly number[])[]): number[] {
  const [first] = vectors;
  if (!first) {
    throw new Error('Cannot average an empty list of vectors');
  }
  const sum = Array.from({ length: first.length }, () => 0);
  for (const vector of vectors) {
    for (let i = 0; i < sum.length; i++) {
      sum[i] += vector[i];
    }
  }
  return normalize(sum.map((value) => value / vectors.length));
}
