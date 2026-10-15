import type { ApiErrorResponse } from '@resume-matcher/shared';
import { isAxiosError } from 'axios';

/** Status used when the request never got a response (server down, network issue). */
export const NETWORK_ERROR_STATUS = 0;

/** A failed API call, normalized from the backend's `ApiErrorResponse` shape. */
export class ApiError extends Error {
  readonly status: number;
  /** Individual messages when the API returned several (e.g. validation errors). */
  readonly messages: string[];

  constructor(status: number, message: string, messages: string[] = [message]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'statusCode' in data &&
    'message' in data &&
    (typeof data.message === 'string' || Array.isArray(data.message))
  );
}

/** Converts anything thrown by an API call into an `ApiError` with a user-facing message. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (isAxiosError(error)) {
    if (!error.response) {
      return new ApiError(
        NETWORK_ERROR_STATUS,
        'Cannot reach the server. Check that the backend is running and try again.',
      );
    }
    const { status, data } = error.response;
    if (isApiErrorResponse(data)) {
      const messages = Array.isArray(data.message) ? data.message : [data.message];
      return new ApiError(status, messages.join(' '), messages);
    }
    return new ApiError(status, `Request failed (${status}).`);
  }
  return new ApiError(NETWORK_ERROR_STATUS, 'Something went wrong. Please try again.');
}

/** User-facing message for any error, for toasts and inline alerts. */
export function getErrorMessage(error: unknown): string {
  return toApiError(error).message;
}
