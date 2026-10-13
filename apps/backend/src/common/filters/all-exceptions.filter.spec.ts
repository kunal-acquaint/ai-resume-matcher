import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { HttpAdapterHost } from '@nestjs/core';
import type { ApiErrorResponse } from '@resume-matcher/shared';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  const response = {};
  const host = {
    switchToHttp: () => ({ getRequest: () => ({}), getResponse: () => response }),
  } as unknown as ArgumentsHost;

  const reply = vi.fn();
  const httpAdapterHost = {
    httpAdapter: { getRequestUrl: () => '/api/test', reply },
  } as unknown as HttpAdapterHost;

  let filter: AllExceptionsFilter;

  beforeEach(() => {
    reply.mockReset();
    filter = new AllExceptionsFilter(httpAdapterHost);
  });

  function catchAndGetBody(exception: unknown): ApiErrorResponse {
    filter.catch(exception, host);
    expect(reply).toHaveBeenCalledOnce();
    const [res, body, status] = reply.mock.calls[0] as [unknown, ApiErrorResponse, number];
    expect(res).toBe(response);
    expect(status).toBe(body.statusCode);
    return body;
  }

  it('formats built-in HTTP exceptions', () => {
    const body = catchAndGetBody(new ConflictException('Resume already uploaded.'));

    expect(body).toEqual({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: 'Resume already uploaded.',
      path: '/api/test',
      timestamp: expect.any(String),
    });
  });

  it('keeps validation messages as an array', () => {
    const body = catchAndGetBody(
      new BadRequestException(['title should not be empty', 'description must be a string']),
    );

    expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body.message).toEqual(['title should not be empty', 'description must be a string']);
  });

  it('handles exceptions created with a plain string response', () => {
    const body = catchAndGetBody(new HttpException('Too many requests', 429));

    expect(body).toMatchObject({ statusCode: 429, message: 'Too many requests' });
  });

  it('passes non-standard response objects through as details', () => {
    const healthResult = { status: 'error', error: { mongodb: { status: 'down' } } };
    const body = catchAndGetBody(new ServiceUnavailableException(healthResult));

    expect(body.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(body.details).toEqual(healthResult);
    expect(typeof body.message).toBe('string');
  });

  it('hides internal details of unexpected errors and logs them', () => {
    const logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const body = catchAndGetBody(new Error('database password is hunter2'));

    expect(body).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Internal server error',
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(logSpy).toHaveBeenCalledOnce();
    logSpy.mockRestore();
  });
});
