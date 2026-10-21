import { Badge } from '@/components/ui/Badge';
import { formatPercent } from '@/lib/format';
import { scoreLabel, scoreTone } from './score-tier';

/** Score as a coloured percentage badge; the tier name is available to screen readers. */
export function ScoreBadge({ score }: { score: number }) {
  return (
    <Badge tone={scoreTone(score)} className="tabular-nums">
      {formatPercent(score)}
      <span className="sr-only"> ({scoreLabel(score)})</span>
    </Badge>
  );
}
