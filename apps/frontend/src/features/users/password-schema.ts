import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@resume-matcher/shared';
import { z } from 'zod';

/** New password + confirmation, following the shared length policy. */
export const newPasswordFields = {
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`),
  confirmPassword: z.string(),
};

export const passwordsMatch = {
  check: (values: { newPassword: string; confirmPassword: string }) =>
    values.newPassword === values.confirmPassword,
  params: { message: 'The passwords don’t match', path: ['confirmPassword'] },
};

export const newPasswordSchema = z
  .object(newPasswordFields)
  .refine(passwordsMatch.check, passwordsMatch.params);

export type NewPasswordForm = z.infer<typeof newPasswordSchema>;
