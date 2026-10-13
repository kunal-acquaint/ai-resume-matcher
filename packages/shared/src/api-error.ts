/**
 * Body returned by the API for every non-2xx response.
 */
export interface ApiErrorResponse {
  statusCode: number;
  /** HTTP reason phrase, e.g. "Not Found" or "Conflict". */
  error: string;
  /** Human-readable message; validation failures return one entry per issue. */
  message: string | string[];
  /** Extra structured data when the error carries it (e.g. failed health check results). */
  details?: unknown;
  path: string;
  timestamp: string;
}
