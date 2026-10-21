import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { RouteObject } from 'react-router';
import * as jobsApi from '@/features/jobs/jobs-api';
import { ApiError } from '@/lib/api/api-error';
import { makeCandidate, makeJob, page } from '@/test/fixtures';
import { renderRoutes } from '@/test/render';
import { CandidateDetailPage } from './CandidateDetailPage';
import * as candidatesApi from './candidates-api';
import { MatchResumePage } from './MatchResumePage';

vi.mock('./candidates-api');
vi.mock('@/features/jobs/jobs-api');

const routes: RouteObject[] = [
  { path: '/match', element: <MatchResumePage /> },
  { path: '/candidates/:id', element: <CandidateDetailPage /> },
  { path: '/jobs/:id', element: <h1>Job page</h1> },
];

const READY = makeJob({ id: 'job-ready', title: 'Backend Engineer' });
const EXTRACTING = makeJob({ id: 'job-busy', title: 'Data Engineer', skillsStatus: 'extracting' });
const resumeFile = () => new File(['%PDF-1.4'], 'aarav.pdf', { type: 'application/pdf' });

describe('MatchResumePage', () => {
  beforeEach(() => {
    vi.mocked(jobsApi.listJobs).mockResolvedValue(page([READY, EXTRACTING]));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('offers only active jobs whose skills are ready, and preselects ?jobId', async () => {
    renderRoutes(routes, '/match?jobId=job-ready');

    const select = await screen.findByLabelText('Job');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Select a job…', 'Backend Engineer']);
    await waitFor(() => expect(select).toHaveValue('job-ready'));
    expect(screen.getByText('React, Node.js')).toBeInTheDocument();
    expect(vi.mocked(jobsApi.listJobs)).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('explains when no job is ready', async () => {
    vi.mocked(jobsApi.listJobs).mockResolvedValue(page([EXTRACTING]));

    renderRoutes(routes, '/match');

    expect(await screen.findByText('No job is ready for matching')).toBeInTheDocument();
  });

  it('validates the fields and the file before uploading', async () => {
    const { user } = renderRoutes(routes, '/match');

    await user.click(await screen.findByRole('button', { name: 'Match resume' }));

    expect(await screen.findByText('Select a job')).toBeInTheDocument();
    expect(screen.getByText('Enter the candidate’s name')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Drop the resume here/), {
      target: { files: [new File(['text'], 'resume.docx', { type: 'application/msword' })] },
    });
    expect(await screen.findByText('Only PDF files are allowed')).toBeInTheDocument();
    expect(candidatesApi.uploadResume).not.toHaveBeenCalled();
  });

  it('uploads the resume and opens the result', async () => {
    vi.mocked(candidatesApi.uploadResume).mockResolvedValue(makeCandidate({ id: 'cand-9' }));
    vi.mocked(candidatesApi.getCandidate).mockResolvedValue(makeCandidate({ id: 'cand-9' }));
    const { user, router } = renderRoutes(routes, '/match');

    await user.selectOptions(await screen.findByLabelText('Job'), 'job-ready');
    await user.type(screen.getByLabelText('Candidate name'), 'Aarav Mehta');
    await user.upload(screen.getByLabelText(/Drop the resume here/), resumeFile());
    expect(screen.getByText('aarav.pdf')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Match resume' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/candidates/cand-9'));
    const [jobId, input] = vi.mocked(candidatesApi.uploadResume).mock.calls[0] ?? [];
    expect(jobId).toBe('job-ready');
    expect(input).toMatchObject({ candidateName: 'Aarav Mehta', candidateEmail: undefined });
    expect(input?.file.name).toBe('aarav.pdf');
    expect(await screen.findByText('Aarav Mehta scored 82%')).toBeInTheDocument();
  });

  it('shows the API error, e.g. for a duplicate resume', async () => {
    vi.mocked(candidatesApi.uploadResume).mockRejectedValue(
      new ApiError(409, 'Resume already uploaded.'),
    );
    const { user, router } = renderRoutes(routes, '/match?jobId=job-ready');

    await user.type(await screen.findByLabelText('Candidate name'), 'Aarav Mehta');
    await user.upload(screen.getByLabelText(/Drop the resume here/), resumeFile());
    await user.click(screen.getByRole('button', { name: 'Match resume' }));

    expect(await screen.findByText('Resume already uploaded.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/match');
  });
});

describe('CandidateDetailPage', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows the score breakdown and the evidence for each skill', async () => {
    vi.mocked(candidatesApi.getCandidate).mockResolvedValue(makeCandidate());

    renderRoutes(routes, '/candidates/cand-1');

    expect(await screen.findByRole('heading', { name: 'Aarav Mehta' })).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('Strong match')).toBeInTheDocument();
    expect(screen.getByText('3 of 4 required skills found.')).toBeInTheDocument();
    expect(screen.getByText('Found in the resume')).toBeInTheDocument();
    expect(screen.getByText('ReactJS')).toBeInTheDocument();
    expect(screen.getByText(/71% similarity/)).toBeInTheDocument();
    expect(screen.getByText('Orchestrated container clusters in production')).toBeInTheDocument();
    expect(
      within(screen.getByRole('list', { name: 'Missing skills' })).getByText('GraphQL'),
    ).toBeInTheDocument();
  });

  it('deletes the candidate after confirmation and returns to the job', async () => {
    vi.mocked(candidatesApi.getCandidate).mockResolvedValue(makeCandidate());
    vi.mocked(candidatesApi.deleteCandidate).mockResolvedValue();
    const { user, router } = renderRoutes(routes, '/candidates/cand-1');

    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Delete candidate?' })).getByRole('button', {
        name: 'Delete',
      }),
    );

    await waitFor(() => expect(router.state.location.pathname).toBe('/jobs/job-1'));
    expect(candidatesApi.deleteCandidate).toHaveBeenCalledWith('cand-1');
  });
});
