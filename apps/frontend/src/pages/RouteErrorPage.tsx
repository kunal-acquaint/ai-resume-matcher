import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

/** Shown when rendering a route throws unexpectedly, instead of a blank screen. */
export function RouteErrorPage() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <title>Something went wrong · AI Resume Matcher</title>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-slate-500">
        An unexpected error occurred. Try reloading the page.
        {detail && <span className="mt-2 block font-mono text-xs text-slate-400">{detail}</span>}
      </p>
      <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to dashboard
      </Link>
    </main>
  );
}
