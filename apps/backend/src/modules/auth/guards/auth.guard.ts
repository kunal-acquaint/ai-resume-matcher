import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { toUserResponse } from '../../users/users.mapper.js';
import { IS_PUBLIC_KEY, SESSION_COOKIE } from '../auth.constants.js';
import { AuthService } from '../auth.service.js';
import type { AuthenticatedRequest } from '../authenticated-request.js';

/**
 * Global guard: every route requires a valid session cookie unless marked `@Public()`.
 * The user is reloaded on each request so removed admins and revoked sessions lose
 * access immediately instead of when the JWT expires.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & Partial<AuthenticatedRequest>>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.auth.verifySession(token);
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid. Please log in again.');
    }

    request.user = toUserResponse(user);
    return true;
  }
}
