import { AxiosError, AxiosHeaders } from 'axios';
import { ApiError, getErrorMessage, NETWORK_ERROR_STATUS, toApiError } from './api-error';

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  });
}

describe('toApiError', () => {
  it('uses the message of the shared API error format', () => {
    const error = toApiError(
      axiosErrorWith(409, {
        statusCode: 409,
        error: 'Conflict',
        message: 'Resume already uploaded.',
        path: '/api/jobs/1/candidates',
        timestamp: '2026-10-15T10:00:00.000Z',
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Resume already uploaded.');
  });

  it('keeps every validation message', () => {
    const error = toApiError(
      axiosErrorWith(400, {
        statusCode: 400,
        error: 'Bad Request',
        message: ['email must be an email', 'password should not be empty'],
      }),
    );

    expect(error.messages).toEqual(['email must be an email', 'password should not be empty']);
    expect(error.message).toBe('email must be an email password should not be empty');
  });

  it('describes network failures', () => {
    const error = toApiError(new AxiosError('Network Error', 'ERR_NETWORK'));

    expect(error.status).toBe(NETWORK_ERROR_STATUS);
    expect(error.message).toMatch(/Cannot reach the server/);
  });

  it('falls back to a generic message for unexpected responses and errors', () => {
    expect(getErrorMessage(axiosErrorWith(502, '<html>Bad gateway</html>'))).toBe(
      'Request failed (502).',
    );
    expect(getErrorMessage(new TypeError('boom'))).toBe('Something went wrong. Please try again.');
  });
});
