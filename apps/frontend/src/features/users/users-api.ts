import type { CreateUserRequest, User } from '@resume-matcher/shared';
import { api } from '@/lib/api/client';

export async function listUsers(): Promise<User[]> {
  const { data } = await api.get<User[]>('/users');
  return data;
}

export async function createUser(body: CreateUserRequest): Promise<User> {
  const { data } = await api.post<User>('/users', body);
  return data;
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/users/${id}`);
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await api.patch(`/users/${id}/password`, { newPassword });
}
