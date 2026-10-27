import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from '@resume-matcher/shared';
import { KeyRound, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { describedBy } from '@/components/ui/form-ids';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, QueryError } from '@/components/ui/States';
import { useSession } from '@/features/auth/session';
import { getErrorMessage } from '@/lib/api/api-error';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  newPasswordFields,
  type NewPasswordForm,
  newPasswordSchema,
  passwordsMatch,
} from './password-schema';
import { useCreateUser, useDeleteUser, useResetUserPassword, useUsers } from './user-queries';

const addAdminSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(100, 'At most 100 characters'),
    email: z.email('Enter a valid email address'),
    ...newPasswordFields,
  })
  .refine(passwordsMatch.check, passwordsMatch.params);

type AddAdminForm = z.infer<typeof addAdminSchema>;

function AddAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createUser = useCreateUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddAdminForm>({
    resolver: zodResolver(addAdminSchema),
    defaultValues: { name: '', email: '', newPassword: '', confirmPassword: '' },
  });

  const close = () => {
    reset();
    createUser.reset();
    onClose();
  };

  const onSubmit = handleSubmit(({ name, email, newPassword }) => {
    createUser.mutate(
      { name, email, password: newPassword },
      {
        onSuccess: (user) => {
          toast.success(`${user.name} can now log in`);
          close();
        },
      },
    );
  });

  return (
    <Modal
      open={open}
      title="Add admin"
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={createUser.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="add-admin-form" loading={createUser.isPending}>
            Add admin
          </Button>
        </>
      }
    >
      <form
        id="add-admin-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="space-y-4"
      >
        {createUser.isError && <Alert>{getErrorMessage(createUser.error)}</Alert>}
        <FormField htmlFor="admin-name" label="Name" error={errors.name?.message}>
          <Input
            id="admin-name"
            autoComplete="off"
            invalid={!!errors.name}
            aria-describedby={errors.name ? describedBy('admin-name') : undefined}
            {...register('name')}
          />
        </FormField>
        <FormField htmlFor="admin-email" label="Email" error={errors.email?.message}>
          <Input
            id="admin-email"
            type="email"
            autoComplete="off"
            invalid={!!errors.email}
            aria-describedby={errors.email ? describedBy('admin-email') : undefined}
            {...register('email')}
          />
        </FormField>
        <FormField
          htmlFor="admin-password"
          label="Initial password"
          error={errors.newPassword?.message}
          hint="They can change it after logging in."
        >
          <Input
            id="admin-password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            aria-describedby={describedBy('admin-password')}
            {...register('newPassword')}
          />
        </FormField>
        <FormField
          htmlFor="admin-confirm"
          label="Confirm password"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="admin-confirm"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? describedBy('admin-confirm') : undefined}
            {...register('confirmPassword')}
          />
        </FormField>
      </form>
    </Modal>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const resetPassword = useResetUserPassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NewPasswordForm>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const close = () => {
    reset();
    resetPassword.reset();
    onClose();
  };

  const onSubmit = handleSubmit(({ newPassword }) => {
    if (!user) return;
    resetPassword.mutate(
      { id: user.id, newPassword },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${user.name}. They have been signed out.`);
          close();
        },
      },
    );
  });

  return (
    <Modal
      open={user !== null}
      title={`Reset password for ${user?.name ?? ''}`}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={resetPassword.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form" loading={resetPassword.isPending}>
            Reset password
          </Button>
        </>
      }
    >
      <form
        id="reset-password-form"
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="space-y-4"
      >
        <p className="text-sm text-slate-600">
          They will be signed out everywhere and must log in with the new password.
        </p>
        {resetPassword.isError && <Alert>{getErrorMessage(resetPassword.error)}</Alert>}
        <FormField
          htmlFor="reset-password"
          label="New password"
          error={errors.newPassword?.message}
        >
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.newPassword}
            aria-describedby={errors.newPassword ? describedBy('reset-password') : undefined}
            {...register('newPassword')}
          />
        </FormField>
        <FormField
          htmlFor="reset-confirm"
          label="Confirm new password"
          error={errors.confirmPassword?.message}
        >
          <Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? describedBy('reset-confirm') : undefined}
            {...register('confirmPassword')}
          />
        </FormField>
      </form>
    </Modal>
  );
}

export function UsersPage() {
  const { data: users, isPending, isError, error, refetch } = useUsers();
  const { data: me } = useSession();
  const deleteUser = useDeleteUser();
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState<User | null>(null);
  const [removing, setRemoving] = useState<User | null>(null);

  const handleRemove = () => {
    if (!removing) return;
    deleteUser.mutate(removing.id, {
      onSuccess: () => {
        toast.success(`${removing.name} was removed`);
        setRemoving(null);
      },
      onError: (removeError) => {
        toast.error(getErrorMessage(removeError));
        setRemoving(null);
      },
    });
  };

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone listed here is an admin with full access."
        actions={
          <Button onClick={() => setAdding(true)}>
            <UserPlus aria-hidden="true" className="size-4" />
            Add admin
          </Button>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {isPending ? (
          <LoadingState label="Loading users" />
        ) : isError ? (
          <QueryError error={error} onRetry={() => void refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Name
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Email
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Added
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Last login
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isMe = user.id === me?.id;
                  return (
                    <tr key={user.id}>
                      <td className="py-3 pr-4 font-medium text-slate-900">
                        {user.name} {isMe && <Badge tone="brand">You</Badge>}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{user.email}</td>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="whitespace-nowrap py-3 pr-4 text-slate-500">
                        {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Never'}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResetting(user)}
                            disabled={isMe}
                            title={
                              isMe ? 'Change your own password on your profile page' : undefined
                            }
                            aria-label={`Reset password for ${user.name}`}
                          >
                            <KeyRound aria-hidden="true" className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemoving(user)}
                            disabled={isMe}
                            title={isMe ? 'You cannot remove your own account' : undefined}
                            aria-label={`Remove ${user.name}`}
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddAdminDialog open={adding} onClose={() => setAdding(false)} />
      <ResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
      <ConfirmDialog
        open={removing !== null}
        title="Remove admin?"
        confirmLabel="Remove"
        destructive
        loading={deleteUser.isPending}
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      >
        <strong className="font-semibold text-slate-900">{removing?.name}</strong> (
        {removing?.email}) will lose access immediately. Jobs and candidates they created are kept.
      </ConfirmDialog>
    </>
  );
}
