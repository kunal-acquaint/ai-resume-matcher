import { hybridScore, rescale, semanticRawScore } from './scoring.js';

describe('scoring', () => {
  describe('semanticRawScore', () => {
    it('averages the three highest chunk similarities', () => {
      expect(semanticRawScore([0.1, 0.9, 0.5, 0.7, 0.2])).toBeCloseTo((0.9 + 0.7 + 0.5) / 3);
    });

    it('averages all chunks when there are fewer than three', () => {
      expect(semanticRawScore([0.4, 0.6])).toBeCloseTo(0.5);
    });

    it('returns 0 for no chunks and does not mutate its input', () => {
      const input = [0.2, 0.8];
      semanticRawScore(input);

      expect(semanticRawScore([])).toBe(0);
      expect(input).toEqual([0.2, 0.8]);
    });
  });

  describe('rescale', () => {
    it.each([
      [0.25, 0],
      [0.8, 1],
      [0.525, 0.5],
      [0.1, 0], // clamped below the floor
      [0.95, 1], // clamped above the ceiling
    ])('maps raw %f to %f with floor 0.25 / ceiling 0.8', (raw, expected) => {
      expect(rescale(raw, 0.25, 0.8)).toBeCloseTo(expected);
    });
  });

  it('hybridScore weights semantic score and coverage', () => {
    expect(hybridScore(0.5, 1, { semantic: 0.6, coverage: 0.4 })).toBeCloseTo(0.7);
    expect(hybridScore(1, 0, { semantic: 0.6, coverage: 0.4 })).toBeCloseTo(0.6);
  });
});
