import axios from 'axios';
import { toApiError } from './api-error';

/**
 * Shared HTTP client. Authentication uses the backend's httpOnly session cookie,
 * so requests only need `withCredentials`; no token is ever handled in JavaScript.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

/** Endpoints whose 401 means "wrong credentials / no session yet", not "session expired". */
const SESSION_ENDPOINTS = ['/auth/login', '/auth/me'];

let onSessionExpired: (() => void) | undefined;

/** Registers what to do when an authenticated request comes back 401 (e.g. clear the session). */
export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const url = axios.isAxiosError(error) ? (error.config?.url ?? '') : '';
    if (apiError.status === 401 && !SESSION_ENDPOINTS.some((path) => url.endsWith(path))) {
      onSessionExpired?.();
    }
    return Promise.reject(apiError);
  },
);
