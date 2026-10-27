import { zodResolver } from '@hookform/resolvers/zod';
import { type ChangePasswordRequest, PASSWORD_MAX_LENGTH } from '@resume-matcher/shared';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { describedBy } from '@/components/ui/form-ids';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { changePassword } from '@/features/auth/auth-api';
import { useSession } from '@/features/auth/session';
import { newPasswordFields, passwordsMatch } from '@/features/users/password-schema';
import { getErrorMessage } from '@/lib/api/api-error';
import { formatDate, formatDateTime } from '@/lib/format';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password').max(PASSWORD_MAX_LENGTH),
    ...newPasswordFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.params)
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: 'Choose a password different from your current one',
    path: ['newPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

function ChangePasswordCard() {
  const mutation = useMutation({
    mutationFn: (body: ChangePasswordRequest) => changePassword(body),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(({ currentPassword, newPassword }) => {
    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          reset();
          toast.success('Password changed. Your other sessions have been signed out.');
        },
      },
    );
  });

  return (
    <Card
      title="Change password"
      description="You stay logged in here; other devices are signed out."
    >
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="max-w-md space-y-4">
        {mutation.isError && <Alert>{getErrorMessage(mutation.error)}</Alert>}
        <FormField
          htmlFor="current-password"
          label="Current password"
          error={errors.currentPassword?.message}
        >
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.currentPassword}
            aria-describedby={errors.currentPassword ? describedBy('current-password') : undefined}
            {...register('currentPassword')}
          />
        </FormField>
        <FormField htmlFor="new-password" label="New password" error={errors.newPassword?.message}>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? describedBy('new-password') : undefined}
            {...register('newPassword')}
          />
        </FormField>
        <FormField
          htmlFor="confirm-password"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? describedBy('confirm-password') : undefined}
            {...register('confirmPassword')}
          />
        </FormField>
        <Button type="submit" loading={mutation.isPending}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

export function ProfilePage() {
  const { data: user } = useSession();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Profile" />
      {user && (
        <Card title="Your account">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Admin since</dt>
              <dd className="text-slate-900">{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Last login</dt>
              <dd className="text-slate-900">
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—'}
              </dd>
            </div>
          </dl>
        </Card>
      )}
      <ChangePasswordCard />
    </div>
  );
}
