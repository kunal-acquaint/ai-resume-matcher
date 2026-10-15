import type { ChangePasswordRequest, LoginRequest, User } from '@resume-matcher/shared';
import { ApiError } from '@/lib/api/api-error';
import { api } from '@/lib/api/client';

export async function login(credentials: LoginRequest): Promise<User> {
  const { data } = await api.post<User>('/auth/login', credentials);
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

/** Changes the logged-in admin's password; the backend keeps this session and ends all others. */
export async function changePassword(body: ChangePasswordRequest): Promise<void> {
  await api.patch('/auth/me/password', body);
}

/** The logged-in admin, or null when there is no valid session. */
export async function fetchSession(): Promise<User | null> {
  try {
    const { data } = await api.get<User>('/auth/me');
    return data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
