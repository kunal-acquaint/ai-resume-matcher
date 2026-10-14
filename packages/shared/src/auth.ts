/** Password length policy (NIST SP 800-63B: length over composition rules). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** An admin account as returned by the API. Dates are ISO 8601 strings. */
export interface User {
  id: string;
  name: string;
  email: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}
