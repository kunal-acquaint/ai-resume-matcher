import type { ApiErrorResponse } from '@resume-matcher/shared';
import request from 'supertest';
import { createTestApp, type TestContext } from './utils/test-app.js';

// Separate file (and app instance) so the strict limit doesn't affect other suites.
describe('Login rate limit (e2e)', () => {
  let ctx: TestContext;
  const attempt = () =>
    request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'attacker@example.com', password: 'guess-password' });

  beforeAll(async () => {
    ctx = await createTestApp('rate-limit-e2e', { LOGIN_RATE_LIMIT: '5' });
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('blocks the 6th login attempt within a minute with 429', async () => {
    for (let i = 0; i < 5; i++) {
      await attempt().expect(401);
    }
    const res = await attempt().expect(429);

    expect((res.body as ApiErrorResponse).message).toBe(
      'Too many login attempts. Please try again in a minute.',
    );
  });

  it('does not rate limit other routes', async () => {
    for (let i = 0; i < 10; i++) {
      await request(ctx.app.getHttpServer()).get('/api/health').expect(200);
    }
  });
});
