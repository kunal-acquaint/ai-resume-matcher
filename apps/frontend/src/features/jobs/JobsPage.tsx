import { DEFAULT_PAGE_SIZE, JOB_STATUSES, type JobStatus } from '@resume-matcher/shared';
import { Briefcase, Plus, Search } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { Select } from '@/components/ui/Select';
import { EmptyState, LoadingState, QueryError } from '@/components/ui/States';
import { useListParams } from '@/hooks/useListParams';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useJobs } from './job-queries';
import { JobStatusBadge, SkillsStatusBadge } from './JobStatusBadges';

const linkButtonClass =
  'inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700';

function parseStatus(value: string | null): JobStatus | undefined {
  return JOB_STATUSES.find((status) => status === value);
}

export function JobsPage() {
  const { params, updateParams, page, setPage, search, setSearch, appliedSearch } = useListParams();
  const status = parseStatus(params.get('status'));

  const { data, isPending, isError, error, refetch, isFetching } = useJobs({
    status,
    search: appliedSearch,
    page,
    limit: DEFAULT_PAGE_SIZE,
  });
  const hasFilters = Boolean(status || appliedSearch);

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Job openings and the skills their candidates are matched against."
        actions={
          <Link to="/jobs/new" className={linkButtonClass}>
            <Plus aria-hidden="true" className="size-4" />
            New job
          </Link>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              type="search"
              aria-label="Search jobs by title"
              placeholder="Search by title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            aria-label="Filter by status"
            value={status ?? ''}
            onChange={(event) =>
              updateParams({ status: event.target.value || undefined, page: undefined })
            }
            className="sm:w-44"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </Select>
        </div>

        <div className="p-4">
          {isPending ? (
            <LoadingState label="Loading jobs" />
          ) : isError ? (
            <QueryError error={error} onRetry={() => void refetch()} />
          ) : data.items.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={hasFilters ? 'No jobs match your filters' : 'No jobs yet'}
              description={
                hasFilters
                  ? 'Try a different search or status.'
                  : 'Create a job to start matching resumes against it.'
              }
              action={
                !hasFilters && (
                  <Link to="/jobs/new" className={linkButtonClass}>
                    <Plus aria-hidden="true" className="size-4" />
                    New job
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
                        Title
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Status
                      </th>
                      <th scope="col" className="py-2 pr-4 font-medium">
                        Skills
                      </th>
                      <th scope="col" className="py-2 pr-4 text-right font-medium">
                        Candidates
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items.map((job) => (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="py-3 pr-4">
                          <Link
                            to={`/jobs/${job.id}`}
                            className="font-medium text-slate-900 hover:text-brand-700"
                          >
                            {job.title}
                          </Link>
                        </td>
                        <td className="py-3 pr-4">
                          <JobStatusBadge status={job.status} />
                        </td>
                        <td className="py-3 pr-4">
                          <SkillsStatusBadge status={job.skillsStatus} />
                        </td>
                        <td className="py-3 pr-4 text-right tabular-nums">{job.candidateCount}</td>
                        <td className="whitespace-nowrap py-3 text-slate-500">
                          {formatDate(job.createdAt)}
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
      </div>
    </>
  );
}
