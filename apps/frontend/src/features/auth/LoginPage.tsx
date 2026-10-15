import { zodResolver } from '@hookform/resolvers/zod';
import { PASSWORD_MAX_LENGTH } from '@resume-matcher/shared';
import { FileSearch } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { describedBy } from '@/components/ui/form-ids';
import { Input } from '@/components/ui/Input';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { getErrorMessage } from '@/lib/api/api-error';
import type { LoginRedirectState } from './RequireAuth';
import { useLogin, useSession } from './session';

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
});

type LoginForm = z.infer<typeof loginSchema>;

function hasFrom(state: unknown): state is Required<LoginRedirectState> {
  return (
    typeof state === 'object' && state !== null && 'from' in state && typeof state.from === 'string'
  );
}

/** Only allow redirects to in-app paths, never to another site. */
function safeRedirect(state: unknown): string {
  if (!hasFrom(state)) return '/';
  return state.from.startsWith('/') && !state.from.startsWith('//') ? state.from : '/';
}

export function LoginPage() {
  const session = useSession();
  const loginMutation = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = safeRedirect(location.state);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (session.isPending) {
    return <FullPageSpinner label="Checking your session" />;
  }
  if (session.data) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate(values, {
      onSuccess: () => {
        void navigate(redirectTo, { replace: true });
      },
    });
  });

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <title>Log in · AI Resume Matcher</title>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <FileSearch aria-hidden="true" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Resume Matcher</h1>
            <p className="mt-1 text-sm text-slate-500">Log in with your admin account</p>
          </div>
        </div>

        <form
          noValidate
          onSubmit={(event) => void onSubmit(event)}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          {loginMutation.isError && <Alert>{getErrorMessage(loginMutation.error)}</Alert>}

          <FormField htmlFor="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              invalid={!!errors.email}
              aria-describedby={errors.email ? describedBy('email') : undefined}
              {...register('email')}
            />
          </FormField>

          <FormField htmlFor="password" label="Password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              invalid={!!errors.password}
              aria-describedby={errors.password ? describedBy('password') : undefined}
              {...register('password')}
            />
          </FormField>

          <Button type="submit" className="w-full" loading={loginMutation.isPending}>
            Log in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Forgot your password? Ask another admin to reset it.
        </p>
      </div>
    </main>
  );
}
