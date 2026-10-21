import type { Candidate, MatchedSkill } from '@resume-matcher/shared';
import { ArrowLeft, CircleCheck, CircleX, Mail, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState, QueryError } from '@/components/ui/States';
import { getErrorMessage } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';
import { formatDateTime, formatPercent } from '@/lib/format';
import { useCandidate, useDeleteCandidate } from './candidate-queries';
import { scoreLabel, scoreTone } from './score-tier';

const TONE_TEXT = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-red-600',
  neutral: 'text-slate-600',
  brand: 'text-brand-600',
} as const;

function Meter({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold tabular-nums text-slate-900">{formatPercent(value)}</span>
      </div>
      {/* Decorative: the percentage is announced from the text above. */}
      <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Evidence({ match }: { match: MatchedSkill }) {
  switch (match.evidence) {
    case 'text':
      return <span className="text-slate-500">Found in the resume</span>;
    case 'alias':
      return (
        <span className="text-slate-500">
          Found as <q className="font-medium text-slate-700">{match.term}</q>
        </span>
      );
    case 'semantic':
      return (
        <span className="text-slate-500">
          Similar passage ({formatPercent(match.similarity ?? 0)} similarity)
          {match.passage && (
            <blockquote className="mt-1 border-l-2 border-slate-200 pl-3 text-xs italic text-slate-500">
              {match.passage}
            </blockquote>
          )}
        </span>
      );
    default:
      return null;
  }
}

function CandidateDetail({ candidate }: { candidate: Candidate }) {
  const navigate = useNavigate();
  const deleteCandidate = useDeleteCandidate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tone = scoreTone(candidate.finalScore);
  const { matched, missing } = candidate.skillMatch;

  const handleDelete = () => {
    deleteCandidate.mutate(candidate.id, {
      onSuccess: () => {
        toast.success(`Removed ${candidate.candidateName}`);
        void navigate(candidate.job ? `/jobs/${candidate.job.id}` : '/', { replace: true });
      },
      onError: (error) => {
        setConfirmDelete(false);
        toast.error(getErrorMessage(error));
      },
    });
  };

  return (
    <>
      <PageHeader
        title={candidate.candidateName}
        description={`Uploaded ${formatDateTime(candidate.createdAt)} by ${candidate.uploadedBy?.name ?? 'Deleted user'} · ${candidate.fileName}`}
        actions={
          <Button variant="secondary" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" className="size-4" />
            Delete
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
        {candidate.job && (
          <span>
            Position:{' '}
            <Link
              to={`/jobs/${candidate.job.id}`}
              className="font-medium text-brand-700 hover:underline"
            >
              {candidate.job.title}
            </Link>
          </span>
        )}
        {candidate.candidateEmail && (
          <a
            href={`mailto:${candidate.candidateEmail}`}
            className="inline-flex items-center gap-1.5 hover:text-brand-700"
          >
            <Mail aria-hidden="true" className="size-4" />
            {candidate.candidateEmail}
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Match score" className="lg:col-span-1">
          <div className="space-y-5">
            <div className="text-center">
              <p className={cn('text-5xl font-semibold tabular-nums', TONE_TEXT[tone])}>
                {formatPercent(candidate.finalScore)}
              </p>
              <Badge tone={tone} className="mt-2">
                {scoreLabel(candidate.finalScore)}
              </Badge>
            </div>
            <Meter
              label="Overall similarity"
              value={candidate.semanticScore}
              hint="How closely the resume’s content matches the job description."
            />
            <Meter
              label="Skill coverage"
              value={candidate.coverage}
              hint={`${candidate.matchedSkillCount} of ${candidate.requiredSkillCount} required skills found.`}
            />
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card
            title={`Matched skills (${matched.length})`}
            description="Each match shows the evidence found in the resume."
          >
            {matched.length === 0 ? (
              <p className="text-sm text-slate-500">None of the required skills were found.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {matched.map((match) => (
                  <li key={match.skill} className="flex gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <CircleCheck
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{match.skill}</p>
                      <Evidence match={match} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={`Missing skills (${missing.length})`}>
            {missing.length === 0 ? (
              <p className="text-sm text-slate-500">The resume shows every required skill.</p>
            ) : (
              <ul aria-label="Missing skills" className="flex flex-wrap gap-2">
                {missing.map((skill) => (
                  <li
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-sm text-red-700"
                  >
                    <CircleX aria-hidden="true" className="size-3.5" />
                    {skill}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Scores assist your review; they don’t replace it. Skill matching can’t judge depth of
        experience.
      </p>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete candidate?"
        confirmLabel="Delete"
        destructive
        loading={deleteCandidate.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        <strong className="font-semibold text-slate-900">{candidate.candidateName}</strong> and
        their score will be deleted. Their resume can be uploaded again later.
      </ConfirmDialog>
    </>
  );
}

export function CandidateDetailPage() {
  const { id = '' } = useParams();
  const { data: candidate, isPending, isError, error, refetch } = useCandidate(id);

  return (
    <>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Dashboard
      </Link>
      {isPending ? (
        <LoadingState label="Loading candidate" />
      ) : isError ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <CandidateDetail candidate={candidate} />
      )}
    </>
  );
}
