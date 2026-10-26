import { screen, waitFor, within } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import * as candidatesApi from '@/features/candidates/candidates-api';
import { ApiError } from '@/lib/api/api-error';
import { makeJob, page } from '@/test/fixtures';
import { renderRoutes } from '@/test/render';
import { JobDetailPage } from './JobDetailPage';
import { EditJobPage, NewJobPage } from './JobFormPage';
import * as jobsApi from './jobs-api';
import { JobsPage } from './JobsPage';

vi.mock('./jobs-api');
vi.mock('@/features/candidates/candidates-api');

const routes: RouteObject[] = [
  { path: '/jobs', element: <JobsPage /> },
  { path: '/jobs/new', element: <NewJobPage /> },
  { path: '/jobs/:id', element: <JobDetailPage /> },
  { path: '/jobs/:id/edit', element: <EditJobPage /> },
];

describe('Jobs pages', () => {
  beforeEach(() => {
    vi.mocked(candidatesApi.listCandidates).mockResolvedValue(page([]));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('JobsPage', () => {
    it('lists jobs with their status and candidate count', async () => {
      vi.mocked(jobsApi.listJobs).mockResolvedValue(
        page([
          makeJob({ id: 'a', title: 'Backend Engineer', candidateCount: 3 }),
          makeJob({ id: 'b', title: 'Data Analyst', status: 'closed', skillsStatus: 'failed' }),
        ]),
      );

      renderRoutes(routes, '/jobs');

      const row = (await screen.findByRole('link', { name: 'Backend Engineer' })).closest('tr');
      expect(within(row as HTMLElement).getByText('Active')).toBeInTheDocument();
      expect(within(row as HTMLElement).getByText('3')).toBeInTheDocument();
      const closedRow = screen.getByRole('link', { name: 'Data Analyst' }).closest('tr');
      expect(within(closedRow as HTMLElement).getByText('Closed')).toBeInTheDocument();
      expect(within(closedRow as HTMLElement).getByText('Skills needed')).toBeInTheDocument();
    });

    it('filters by status through the URL', async () => {
      vi.mocked(jobsApi.listJobs).mockResolvedValue(page([makeJob()]));
      const { user, router } = renderRoutes(routes, '/jobs');
      await screen.findByRole('link', { name: 'Senior Full-Stack Developer' });

      await user.selectOptions(screen.getByLabelText('Filter by status'), 'closed');

      await waitFor(() => expect(router.state.location.search).toBe('?status=closed'));
      expect(vi.mocked(jobsApi.listJobs)).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'closed', page: 1 }),
      );
    });

    it('explains an empty list', async () => {
      vi.mocked(jobsApi.listJobs).mockResolvedValue(page([]));

      renderRoutes(routes, '/jobs');

      expect(await screen.findByText('No jobs yet')).toBeInTheDocument();
    });
  });

  describe('NewJobPage', () => {
    it('validates title and description before submitting', async () => {
      const { user } = renderRoutes(routes, '/jobs/new');

      await user.type(await screen.findByLabelText('Job description'), 'Too short');
      await user.click(screen.getByRole('button', { name: 'Create job' }));

      expect(await screen.findByText('Enter a job title')).toBeInTheDocument();
      expect(screen.getByText(/at least 50 characters/)).toBeInTheDocument();
      expect(jobsApi.createJob).not.toHaveBeenCalled();
    });

    it('creates the job and opens it', async () => {
      const created = makeJob({ id: 'new-job', skillsStatus: 'extracting', requiredSkills: [] });
      vi.mocked(jobsApi.createJob).mockResolvedValue(created);
      vi.mocked(jobsApi.getJob).mockResolvedValue(created);
      const { user, router } = renderRoutes(routes, '/jobs/new');

      await user.type(await screen.findByLabelText('Title'), 'Senior Full-Stack Developer');
      await user.type(screen.getByLabelText('Job description'), created.description);
      await user.click(screen.getByRole('button', { name: 'Create job' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/jobs/new-job'));
      expect(vi.mocked(jobsApi.createJob).mock.calls[0]?.[0]).toEqual({
        title: 'Senior Full-Stack Developer',
        description: created.description,
      });
      expect(await screen.findByText(/Extracting the required skills/)).toBeInTheDocument();
    });
  });

  describe('JobDetailPage', () => {
    it('edits and saves the required skills', async () => {
      const job = makeJob();
      vi.mocked(jobsApi.getJob).mockResolvedValue(job);
      vi.mocked(jobsApi.updateJob).mockImplementation((_id, body) =>
        Promise.resolve(
          makeJob({
            requiredSkills: (body.requiredSkills ?? []).map((s) => ({
              name: s.name,
              aliases: s.aliases ?? [],
              source: 'manual',
            })),
          }),
        ),
      );
      const { user } = renderRoutes(routes, '/jobs/job-1');

      await user.click(await screen.findByRole('button', { name: 'Edit skills' }));
      await user.click(screen.getByRole('button', { name: 'Remove Node.js' }));
      await user.click(screen.getByRole('button', { name: 'Add skill' }));
      await user.type(screen.getByLabelText('Skill 2 name'), 'Docker');
      await user.click(screen.getByRole('button', { name: 'Save skills' }));

      await waitFor(() =>
        expect(jobsApi.updateJob).toHaveBeenCalledWith('job-1', {
          requiredSkills: [
            { name: 'React', aliases: ['React.js', 'ReactJS'] },
            { name: 'Docker', aliases: [] },
          ],
        }),
      );
      const skills = await screen.findByRole('list', { name: 'Required skills' });
      expect(within(skills).getByText('Docker')).toBeInTheDocument();
    });

    it('offers to retry when skill extraction failed', async () => {
      vi.mocked(jobsApi.getJob).mockResolvedValue(
        makeJob({ skillsStatus: 'failed', requiredSkills: [] }),
      );
      vi.mocked(jobsApi.extractSkills).mockResolvedValue(makeJob({ skillsStatus: 'extracting' }));
      const { user } = renderRoutes(routes, '/jobs/job-1');

      await user.click(await screen.findByRole('button', { name: 'Retry extraction' }));

      expect(jobsApi.extractSkills).toHaveBeenCalledWith('job-1');
      expect(await screen.findByText(/Extracting the required skills/)).toBeInTheDocument();
    });

    it('confirms before deleting and returns to the list', async () => {
      vi.mocked(jobsApi.getJob).mockResolvedValue(makeJob({ candidateCount: 4 }));
      vi.mocked(jobsApi.deleteJob).mockResolvedValue();
      vi.mocked(jobsApi.listJobs).mockResolvedValue(page([]));
      const { user, router } = renderRoutes(routes, '/jobs/job-1');

      await user.click(await screen.findByRole('button', { name: 'Delete' }));
      const dialog = screen.getByRole('dialog', { name: 'Delete this job?' });
      expect(dialog).toHaveTextContent('its 4 candidates will be permanently deleted');
      await user.click(within(dialog).getByRole('button', { name: 'Delete job' }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/jobs'));
      expect(jobsApi.deleteJob).toHaveBeenCalledWith('job-1');
    });

    it('shows the API error when the job does not exist', async () => {
      vi.mocked(jobsApi.getJob).mockRejectedValue(new ApiError(404, 'Job not found'));

      renderRoutes(routes, '/jobs/missing');

      expect(await screen.findByRole('alert')).toHaveTextContent('Job not found');
    });
  });
});
