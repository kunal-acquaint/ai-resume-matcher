import { Navigate, Outlet, useLocation } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/api/api-error';
import { useSession } from './session';

/** Location state used to send the admin back to the page they asked for after logging in. */
export interface LoginRedirectState {
  from?: string;
}

/** Route guard: renders child routes only for a logged-in admin, otherwise redirects to /login. */
export function RequireAuth() {
  const { data: user, isPending, isError, error, refetch } = useSession();
  const location = useLocation();

  if (isPending) {
    return <FullPageSpinner label="Checking your session" />;
  }
  if (isError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <Alert>{getErrorMessage(error)}</Alert>
        <Button variant="secondary" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!user) {
    const state: LoginRedirectState = { from: `${location.pathname}${location.search}` };
    return <Navigate to="/login" replace state={state} />;
  }
  return <Outlet />;
}
