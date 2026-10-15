import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { toast, Toaster } from 'sonner';
import { sessionQueryKey } from '@/features/auth/session';
import { setSessionExpiredHandler } from '@/lib/api/client';
import { createQueryClient } from '@/lib/query-client';
import { routes } from './routes';

const router = createBrowserRouter(routes);

export function App() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => {
    // Any authenticated request answered with 401: the session ended (expired, revoked or
    // the admin was removed). Clearing it makes RequireAuth redirect to the login page.
    setSessionExpiredHandler(() => {
      if (queryClient.getQueryData(sessionQueryKey)) {
        toast.info('Your session has ended. Please log in again.');
      }
      queryClient.setQueryData(sessionQueryKey, null);
    });
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
