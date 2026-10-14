import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { User } from '@resume-matcher/shared';
import type { AuthenticatedRequest } from '../authenticated-request.js';

/** Injects the logged-in admin set by the auth guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
