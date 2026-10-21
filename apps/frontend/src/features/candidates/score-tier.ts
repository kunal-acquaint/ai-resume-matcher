import type { BadgeTone } from '@/components/ui/Badge';

/** Visual tiers for 0..1 scores. Purely presentational; the score itself is never rounded away. */
export function scoreTone(score: number): BadgeTone {
  if (score >= 0.7) return 'success';
  if (score >= 0.4) return 'warning';
  return 'danger';
}

export function scoreLabel(score: number): string {
  if (score >= 0.7) return 'Strong match';
  if (score >= 0.4) return 'Partial match';
  return 'Weak match';
}
