import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { ApiErrorResponse } from '@resume-matcher/shared';

type ErrorFields = Pick<ApiErrorResponse, 'error' | 'message' | 'details'>;

/**
 * Converts every thrown exception into the shared `ApiErrorResponse` shape so
 * the frontend can handle errors uniformly. Unexpected errors are logged with
 * their stack trace and returned as a generic 500 without internal details.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request: unknown = ctx.getRequest();

    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorResponse = {
      statusCode,
      ...AllExceptionsFilter.toErrorFields(exception),
      path: String(httpAdapter.getRequestUrl(request)),
      timestamp: new Date().toISOString(),
    };

    httpAdapter.reply(ctx.getResponse(), body, statusCode);
  }

  private static toErrorFields(exception: unknown): ErrorFields {
    if (!(exception instanceof HttpException)) {
      return { error: 'Internal Server Error', message: 'Internal server error' };
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return { error: exception.name, message: response };
    }

    // Nest's built-in exceptions produce `{ statusCode, message, error }`.
    // Anything else (e.g. Terminus health results) is passed through as `details`.
    const { message, error } = response as { message?: unknown; error?: unknown };
    const hasStandardMessage =
      typeof message === 'string' ||
      (Array.isArray(message) && message.every((item) => typeof item === 'string'));

    return {
      error: typeof error === 'string' ? error : exception.name,
      message: hasStandardMessage ? message : exception.message,
      ...(hasStandardMessage ? {} : { details: response }),
    };
  }
}
