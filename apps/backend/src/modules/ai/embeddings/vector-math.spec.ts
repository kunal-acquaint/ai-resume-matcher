import { dot, meanVector, normalize } from './vector-math.js';

describe('vector math', () => {
  it('dot product of normalized vectors is the cosine similarity', () => {
    expect(dot(normalize([1, 0]), normalize([1, 0]))).toBeCloseTo(1);
    expect(dot(normalize([1, 0]), normalize([0, 1]))).toBeCloseTo(0);
    expect(dot(normalize([1, 0]), normalize([-1, 0]))).toBeCloseTo(-1);
    expect(dot(normalize([1, 1]), normalize([1, 0]))).toBeCloseTo(Math.SQRT1_2);
  });

  it('rejects vectors of different lengths', () => {
    expect(() => dot([1, 2], [1])).toThrow('length mismatch');
  });

  it('normalizes to unit length and leaves a zero vector unchanged', () => {
    const v = normalize([3, 4]);
    expect(v[0]).toBeCloseTo(0.6);
    expect(v[1]).toBeCloseTo(0.8);
    expect(normalize([0, 0])).toEqual([0, 0]);
  });

  it('averages vectors and re-normalizes the result', () => {
    const mean = meanVector([
      [1, 0],
      [0, 1],
    ]);
    expect(mean[0]).toBeCloseTo(Math.SQRT1_2);
    expect(mean[1]).toBeCloseTo(Math.SQRT1_2);
    expect(() => meanVector([])).toThrow('empty');
  });
});
