import type { User } from '@resume-matcher/shared';
import { screen, waitFor } from '@testing-library/react';
import { Outlet, type RouteObject } from 'react-router';
import { ApiError } from '@/lib/api/api-error';
import { renderRoutes } from '@/test/render';
import * as authApi from './auth-api';
import { LoginPage } from './LoginPage';
import { RequireAuth } from './RequireAuth';

vi.mock('./auth-api');

const ADMIN: User = {
  id: 'u1',
  name: 'Alice Admin',
  email: 'alice@example.com',
  lastLoginAt: null,
  createdAt: '2026-10-01T00:00:00.000Z',
};

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <Outlet />,
        children: [
          { index: true, element: <h1>Dashboard page</h1> },
          { path: 'jobs', element: <h1>Jobs page</h1> },
        ],
      },
    ],
  },
];

describe('authentication flow', () => {
  beforeEach(() => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('redirects to the login page when there is no session', async () => {
    const { router } = renderRoutes(routes, '/jobs');

    expect(await screen.findByRole('heading', { name: 'AI Resume Matcher' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('shows protected pages when a session exists', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(ADMIN);

    renderRoutes(routes, '/jobs');

    expect(await screen.findByRole('heading', { name: 'Jobs page' })).toBeInTheDocument();
  });

  it('validates the form before calling the API', async () => {
    const { user } = renderRoutes(routes, '/login');

    await user.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it('logs in and returns to the page that was originally requested', async () => {
    vi.mocked(authApi.login).mockResolvedValue(ADMIN);
    const { user, router } = renderRoutes(routes, '/jobs');

    await user.type(await screen.findByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('heading', { name: 'Jobs page' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/jobs');
    expect(vi.mocked(authApi.login).mock.calls[0]?.[0]).toEqual({
      email: 'alice@example.com',
      password: 'correct-password',
    });
  });

  it('shows the API error when the credentials are wrong', async () => {
    vi.mocked(authApi.login).mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    const { user, router } = renderRoutes(routes, '/login');

    await user.type(await screen.findByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(router.state.location.pathname).toBe('/login');
  });

  it('sends a logged-in admin away from the login page', async () => {
    vi.mocked(authApi.fetchSession).mockResolvedValue(ADMIN);
    const { router } = renderRoutes(routes, '/login');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(screen.getByRole('heading', { name: 'Dashboard page' })).toBeInTheDocument();
  });
});
