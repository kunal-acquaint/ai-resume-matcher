import { screen, waitFor, within } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import * as candidatesApi from '@/features/candidates/candidates-api';
import * as jobsApi from '@/features/jobs/jobs-api';
import { makeCandidateSummary, makeJob, page } from '@/test/fixtures';
import { renderRoutes } from '@/test/render';
import * as dashboardApi from './dashboard-api';
import { DashboardPage } from './DashboardPage';

vi.mock('./dashboard-api');
vi.mock('@/features/candidates/candidates-api');
vi.mock('@/features/jobs/jobs-api');

const routes: RouteObject[] = [{ path: '/', element: <DashboardPage /> }];

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.mocked(dashboardApi.getDashboardStats).mockResolvedValue({
      activeJobs: 3,
      totalResumes: 42,
      resumesThisWeek: 7,
      averageScore: 0.614,
    });
    vi.mocked(jobsApi.listJobs).mockResolvedValue(
      page([
        makeJob({ id: 'job-1', title: 'Backend Engineer' }),
        makeJob({ id: 'job-2', title: 'Data Analyst' }),
      ]),
    );
    vi.mocked(candidatesApi.listCandidates).mockResolvedValue(
      page([
        makeCandidateSummary(),
        makeCandidateSummary({
          id: 'cand-2',
          candidateName: 'Priya Nair',
          finalScore: 0.18,
          matchedSkillCount: 0,
          uploadedBy: null,
        }),
      ]),
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows the summary numbers', async () => {
    renderRoutes(routes);

    const summary = await screen.findByRole('region', { name: 'Summary' });
    await waitFor(() => expect(within(summary).getByText('42')).toBeInTheDocument());
    expect(within(summary).getByText('3')).toBeInTheDocument();
    expect(within(summary).getByText('7')).toBeInTheDocument();
    expect(within(summary).getByText('61%')).toBeInTheDocument();
  });

  it('shows a dash when there is no average score yet', async () => {
    vi.mocked(dashboardApi.getDashboardStats).mockResolvedValue({
      activeJobs: 0,
      totalResumes: 0,
      resumesThisWeek: 0,
      averageScore: null,
    });

    renderRoutes(routes);

    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('lists uploaded resumes with score, skills and uploader', async () => {
    renderRoutes(routes);

    const row = (await screen.findByRole('link', { name: 'Priya Nair' })).closest(
      'tr',
    ) as HTMLElement;
    expect(within(row).getByText('18%')).toBeInTheDocument();
    expect(within(row).getByText('Weak match', { exact: false })).toBeInTheDocument();
    expect(within(row).getByText('0 / 10')).toBeInTheDocument();
    expect(within(row).getByText('Deleted user')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Match Resume' })[0]).toHaveAttribute(
      'href',
      '/match',
    );
  });

  it('filters by job and sorts by score through the URL', async () => {
    const { user, router } = renderRoutes(routes);
    await screen.findByRole('link', { name: 'Priya Nair' });
    await screen.findByRole('option', { name: 'Data Analyst' });

    await user.selectOptions(screen.getByLabelText('Filter by job'), 'job-2');
    await user.selectOptions(screen.getByLabelText('Sort by'), 'score');

    await waitFor(() => expect(router.state.location.search).toBe('?jobId=job-2&sort=score'));
    expect(vi.mocked(candidatesApi.listCandidates)).toHaveBeenLastCalledWith(
      expect.objectContaining({ jobId: 'job-2', sort: 'score', page: 1 }),
    );
  });

  it('removes a candidate after confirmation', async () => {
    vi.mocked(candidatesApi.deleteCandidate).mockResolvedValue();
    const { user } = renderRoutes(routes);

    await user.click(await screen.findByRole('button', { name: 'Remove Priya Nair' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Remove candidate?' })).getByRole('button', {
        name: 'Remove',
      }),
    );

    await waitFor(() => expect(candidatesApi.deleteCandidate).toHaveBeenCalledWith('cand-2'));
  });
});
