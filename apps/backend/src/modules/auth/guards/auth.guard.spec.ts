import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SESSION_COOKIE } from '../auth.constants.js';
import type { AuthService } from '../auth.service.js';
import { AuthGuard } from './auth.guard.js';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  const reflector = new Reflector();
  const verifySession = vi.fn();
  const guard = new AuthGuard(reflector, { verifySession } as unknown as AuthService);

  beforeEach(() => {
    verifySession.mockReset();
    vi.restoreAllMocks();
  });

  it('lets public routes through without a session', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    await expect(guard.canActivate(contextFor({}))).resolves.toBe(true);
    expect(verifySession).not.toHaveBeenCalled();
  });

  it('rejects requests without a session cookie', async () => {
    await expect(guard.canActivate(contextFor({ cookies: {} }))).rejects.toThrow(
      new UnauthorizedException('Not authenticated'),
    );
  });

  it('rejects invalid or revoked sessions', async () => {
    verifySession.mockResolvedValue(null);

    await expect(
      guard.canActivate(contextFor({ cookies: { [SESSION_COOKIE]: 'token' } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the public user shape to the request for valid sessions', async () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    verifySession.mockResolvedValue({
      id: 'u1',
      name: 'Jane',
      email: 'jane@example.com',
      passwordHash: 'secret-hash',
      lastLoginAt: null,
      createdAt,
    });
    const request: Record<string, unknown> = { cookies: { [SESSION_COOKIE]: 'token' } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'u1',
      name: 'Jane',
      email: 'jane@example.com',
      lastLoginAt: null,
      createdAt: createdAt.toISOString(),
    });
  });
});
