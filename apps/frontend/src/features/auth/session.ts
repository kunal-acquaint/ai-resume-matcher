import type { LoginRequest, User } from '@resume-matcher/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSession, login, logout } from './auth-api';

export const sessionQueryKey = ['session'] as const;

/**
 * Current admin (null = logged out). Refetched when the window regains focus,
 * so a session revoked elsewhere (password reset, admin removed) is noticed.
 */
export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: fetchSession,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: LoginRequest) => login(credentials),
    onSuccess: (user: User) => {
      queryClient.setQueryData(sessionQueryKey, user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => logout(),
    onSettled: () => {
      // Drop all cached data of the previous admin, then mark the session as logged out.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionQueryKey[0] });
      queryClient.setQueryData(sessionQueryKey, null);
    },
  });
}
