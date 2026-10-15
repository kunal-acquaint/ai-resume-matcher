import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <title>Page not found · AI Resume Matcher</title>
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-slate-500">The page you’re looking for doesn’t exist.</p>
      <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
        Back to dashboard
      </Link>
    </div>
  );
}
