import {
  CANDIDATE_SORTS,
  type CandidateSort,
  type CandidateSummary,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '@resume-matcher/shared';
import type { LucideIcon } from 'lucide-react';
import { Briefcase, CalendarDays, FileText, Gauge, ScanSearch, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { EmptyState, LoadingState, QueryError } from '@/components/ui/States';
import { useCandidates, useDeleteCandidate } from '@/features/candidates/candidate-queries';
import { ScoreBadge } from '@/features/candidates/ScoreBadge';
import { useJobs } from '@/features/jobs/job-queries';
import { useListParams } from '@/hooks/useListParams';
import { getErrorMessage } from '@/lib/api/api-error';
import { cn } from '@/lib/cn';
import { formatDate, formatPercent } from '@/lib/format';
import { useDashboardStats } from './dashboard-queries';

const matchButtonClass =
  'inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700';

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatsRow() {
  const { data, isPending, isError, error, refetch } = useDashboardStats();
  if (isError) {
    return <QueryError error={error} onRetry={() => void refetch()} />;
  }
  const show = (value: number | undefined) =>
    isPending || value === undefined ? '…' : value.toLocaleString();

  return (
    <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Active jobs" value={show(data?.activeJobs)} icon={Briefcase} />
      <StatCard label="Total resumes" value={show(data?.totalResumes)} icon={FileText} />
      <StatCard label="Resumes this week" value={show(data?.resumesThisWeek)} icon={CalendarDays} />
      <StatCard
        label="Average match score"
        value={
          isPending ? '…' : data.averageScore === null ? '—' : formatPercent(data.averageScore)
        }
        icon={Gauge}
      />
    </section>
  );
}

function parseSort(value: string | null): CandidateSort {
  return CANDIDATE_SORTS.find((sort) => sort === value) ?? 'date';
}

function ResumeTable() {
  const { params, updateParams, page, setPage, search, setSearch, appliedSearch } = useListParams();
  const jobId = params.get('jobId') ?? undefined;
  const sort = parseSort(params.get('sort'));
  const [removing, setRemoving] = useState<CandidateSummary | null>(null);
  const deleteCandidate = useDeleteCandidate();
  const jobs = useJobs({ limit: MAX_PAGE_SIZE });

  const { data, isPending, isError, error, refetch, isFetching } = useCandidates({
    jobId,
    search: appliedSearch,
    sort,
    page,
    limit: DEFAULT_PAGE_SIZE,
  });
  const hasFilters = Boolean(jobId || appliedSearch);

  const handleRemove = () => {
    if (!removing) return;
    deleteCandidate.mutate(removing.id, {
      onSuccess: () => {
        toast.success(`Removed ${removing.candidateName}`);
        setRemoving(null);
      },
      onError: (removeError) => {
        toast.error(getErrorMessage(removeError));
        setRemoving(null);
      },
    });
  };

  return (
    <section
      aria-labelledby="resumes-heading"
      className="rounded-2xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
        <h2 id="resumes-heading" className="text-base font-semibold text-slate-900 lg:mr-auto">
          Uploaded resumes
        </h2>
        <div className="relative lg:w-64">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
          />
          <Input
            type="search"
            aria-label="Search by candidate name"
            placeholder="Search candidates"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          aria-label="Filter by job"
          value={jobId ?? ''}
          onChange={(event) =>
            updateParams({ jobId: event.target.value || undefined, page: undefined })
          }
          className="lg:w-56"
        >
          <option value="">All jobs</option>
          {jobs.data?.items.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
              {job.status === 'closed' ? ' (closed)' : ''}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Sort by"
          value={sort}
          onChange={(event) =>
            updateParams({
              sort: event.target.value === 'date' ? undefined : event.target.value,
              page: undefined,
            })
          }
          className="lg:w-44"
        >
          <option value="date">Newest first</option>
          <option value="score">Highest score</option>
        </Select>
      </div>

      <div className="p-4">
        {isPending ? (
          <LoadingState label="Loading resumes" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasFilters ? 'No resumes match your filters' : 'No resumes yet'}
            description={
              hasFilters
                ? 'Try another job or search.'
                : 'Match a resume against a job to see it here.'
            }
            action={
              !hasFilters && (
                <Link to="/match" className={matchButtonClass}>
                  <ScanSearch aria-hidden="true" className="size-4" />
                  Match Resume
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className={cn('overflow-x-auto', isFetching && 'opacity-60 transition-opacity')}>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Candidate
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Position
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Score
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">
                      Skills
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Uploaded
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      By
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <Link
                          to={`/candidates/${candidate.id}`}
                          className="font-medium text-slate-900 hover:text-brand-700"
                        >
                          {candidate.candidateName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {candidate.job ? (
                          <Link to={`/jobs/${candidate.job.id}`} className="hover:text-brand-700">
                            {candidate.job.title}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <ScoreBadge score={candidate.finalScore} />
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-600">
                        {candidate.matchedSkillCount} / {candidate.requiredSkillCount}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-500">
                        {formatDate(candidate.createdAt)}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {candidate.uploadedBy?.name ?? 'Deleted user'}
                      </td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Remove ${candidate.candidateName}`}
                          onClick={() => setRemoving(candidate)}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </Button>
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
      </div>

      <ConfirmDialog
        open={removing !== null}
        title="Remove candidate?"
        confirmLabel="Remove"
        destructive
        loading={deleteCandidate.isPending}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      >
        <strong className="font-semibold text-slate-900">{removing?.candidateName}</strong> and
        their score for {removing?.job?.title ?? 'this job'} will be deleted. Their resume can be
        uploaded again later.
      </ConfirmDialog>
    </section>
  );
}

export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Resumes matched against your job openings."
        actions={
          <Link to="/match" className={matchButtonClass}>
            <ScanSearch aria-hidden="true" className="size-4" />
            Match Resume
          </Link>
        }
      />
      <div className="space-y-6">
        <StatsRow />
        <ResumeTable />
      </div>
    </>
  );
}
