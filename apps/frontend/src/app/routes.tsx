import type { RouteObject } from 'react-router';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

/**
 * Route tree (spec §14). Pages are code-split with `lazy`, so the login screen
 * doesn't download the app shell and vice versa.
 */
export const routes: RouteObject[] = [
  {
    path: '/login',
    errorElement: <RouteErrorPage />,
    lazy: { Component: async () => (await import('@/features/auth/LoginPage')).LoginPage },
  },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        lazy: { Component: async () => (await import('@/components/layout/AppLayout')).AppLayout },
        children: [
          {
            index: true,
            lazy: {
              Component: async () =>
                (await import('@/features/dashboard/DashboardPage')).DashboardPage,
            },
          },
          {
            path: 'match',
            lazy: {
              Component: async () =>
                (await import('@/features/candidates/MatchResumePage')).MatchResumePage,
            },
          },
          {
            path: 'candidates/:id',
            lazy: {
              Component: async () =>
                (await import('@/features/candidates/CandidateDetailPage')).CandidateDetailPage,
            },
          },
          {
            path: 'jobs',
            lazy: { Component: async () => (await import('@/features/jobs/JobsPage')).JobsPage },
          },
          {
            path: 'jobs/new',
            lazy: {
              Component: async () => (await import('@/features/jobs/JobFormPage')).NewJobPage,
            },
          },
          {
            path: 'jobs/:id',
            lazy: {
              Component: async () => (await import('@/features/jobs/JobDetailPage')).JobDetailPage,
            },
          },
          {
            path: 'jobs/:id/edit',
            lazy: {
              Component: async () => (await import('@/features/jobs/JobFormPage')).EditJobPage,
            },
          },
          {
            path: 'users',
            lazy: { Component: async () => (await import('@/features/users/UsersPage')).UsersPage },
          },
          {
            path: 'profile',
            lazy: {
              Component: async () => (await import('@/features/profile/ProfilePage')).ProfilePage,
            },
          },
          {
            path: '*',
            lazy: { Component: async () => (await import('@/pages/NotFoundPage')).NotFoundPage },
          },
        ],
      },
    ],
  },
];
