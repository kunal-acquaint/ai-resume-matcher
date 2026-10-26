import type { Job } from '@resume-matcher/shared';
import { ArrowLeft, Pencil, ScanSearch, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, LoadingState, QueryError } from '@/components/ui/States';
import { useCandidates } from '@/features/candidates/candidate-queries';
import { ScoreBadge } from '@/features/candidates/ScoreBadge';
import { getErrorMessage } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useDeleteJob, useJob, useUpdateJob } from './job-queries';
import { JobStatusBadge, SkillsStatusBadge } from './JobStatusBadges';
import { SkillsEditor } from './SkillsEditor';

const CANDIDATES_PER_PAGE = 10;

const linkButton = (variant: 'primary' | 'secondary', disabled = false) =>
  cn(
    'inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm',
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    disabled && 'pointer-events-none opacity-50',
  );

function RankedCandidates({ job }: { job: Job }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useCandidates({
    jobId: job.id,
    sort: 'score',
    page,
    limit: CANDIDATES_PER_PAGE,
  });

  return (
    <Card title="Candidates" description="Ranked by match score.">
      {isPending ? (
        <LoadingState label="Loading candidates" />
      ) : isError ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No resumes matched yet"
          description={
            job.status === 'active' && job.skillsStatus === 'ready'
              ? 'Upload a resume to score it against this job.'
              : 'Resumes can be matched once the job is active and its skills are ready.'
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    #
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Candidate
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Score
                  </th>
                  <th scope="col" className="py-2 pr-4 text-right font-medium">
                    Skills
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Uploaded
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((candidate, index) => (
                  <tr key={candidate.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 tabular-nums text-slate-400">
                      {(data.page - 1) * data.limit + index + 1}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        to={`/candidates/${candidate.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {candidate.candidateName}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <ScoreBadge score={candidate.finalScore} />
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-slate-600">
                      {candidate.matchedSkillCount} / {candidate.requiredSkillCount}
                    </td>
                    <td className="whitespace-nowrap py-3 text-slate-500">
                      {formatDate(candidate.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.page}
            limit={data.limit}
            total={data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </Card>
  );
}

function JobDetail({ job }: { job: Job }) {
  const navigate = useNavigate();
  const updateJob = useUpdateJob(job.id);
  const deleteJob = useDeleteJob();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canMatch = job.status === 'active' && job.skillsStatus === 'ready';

  const toggleStatus = () => {
    const status = job.status === 'active' ? 'closed' : 'active';
    updateJob.mutate(
      { status },
      {
        onSuccess: () => toast.success(status === 'closed' ? 'Job closed' : 'Job reopened'),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const handleDelete = () => {
    deleteJob.mutate(job.id, {
      onSuccess: () => {
        toast.success(`Deleted “${job.title}”`);
        void navigate('/jobs', { replace: true });
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
        title={job.title}
        description={`Created ${formatDate(job.createdAt)} by ${job.createdBy?.name ?? 'Deleted user'} · ${job.candidateCount} candidate${job.candidateCount === 1 ? '' : 's'}`}
        actions={
          <>
            <Link
              to={`/match?jobId=${job.id}`}
              className={linkButton('primary', !canMatch)}
              aria-disabled={!canMatch || undefined}
              tabIndex={canMatch ? undefined : -1}
              title={
                canMatch ? undefined : 'Available when the job is active and its skills are ready'
              }
            >
              <ScanSearch aria-hidden="true" className="size-4" />
              Match resume
            </Link>
            <Link to={`/jobs/${job.id}/edit`} className={linkButton('secondary')}>
              <Pencil aria-hidden="true" className="size-4" />
              Edit
            </Link>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <JobStatusBadge status={job.status} />
        <SkillsStatusBadge status={job.skillsStatus} />
      </div>

      <div className="space-y-6">
        <SkillsEditor job={job} />
        <RankedCandidates job={job} />

        <Card title="Job description">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{job.description}</p>
        </Card>

        <Card title="Manage job">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {job.status === 'active'
                ? 'Closing hides the job from the Resume Matcher. Its candidates are kept.'
                : 'Reopening lets you match new resumes against this job again.'}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={toggleStatus} loading={updateJob.isPending}>
                {job.status === 'active' ? 'Close job' : 'Reopen job'}
              </Button>
              <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden="true" className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this job?"
        confirmLabel="Delete job"
        destructive
        loading={deleteJob.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      >
        <strong className="font-semibold text-slate-900">{job.title}</strong> and{' '}
        {job.candidateCount === 0
          ? 'its settings'
          : `its ${job.candidateCount} candidate${job.candidateCount === 1 ? '' : 's'}`}{' '}
        will be permanently deleted. This can’t be undone.
      </ConfirmDialog>
    </>
  );
}

export function JobDetailPage() {
  const { id = '' } = useParams();
  const { data: job, isPending, isError, error, refetch } = useJob(id);

  return (
    <>
      <Link
        to="/jobs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All jobs
      </Link>
      {isPending ? (
        <LoadingState label="Loading job" />
      ) : isError ? (
        <QueryError error={error} onRetry={() => void refetch()} />
      ) : (
        <JobDetail job={job} />
      )}
    </>
  );
}
