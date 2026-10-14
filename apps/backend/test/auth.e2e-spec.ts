import type { ApiErrorResponse, User } from '@resume-matcher/shared';
import request from 'supertest';
import { createTestApp, TEST_PASSWORD, type TestContext } from './utils/test-app.js';

function sessionCookie(setCookie: string | string[] | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = cookies.find((c) => c.startsWith('access_token='));
  if (!cookie) throw new Error('No session cookie set');
  return cookie;
}

describe('Auth (e2e)', () => {
  let ctx: TestContext;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp('auth-e2e');
    await ctx.createAdmin('admin@example.com');
  });

  afterAll(async () => {
    await ctx?.close();
  });

  describe('protected routes', () => {
    it('reject requests without a session', async () => {
      const res = await http().get('/api/auth/me').expect(401);

      expect(res.body as ApiErrorResponse).toMatchObject({
        statusCode: 401,
        message: 'Not authenticated',
      });
    });

    it('reject a tampered session cookie', async () => {
      await http().get('/api/auth/me').set('Cookie', 'access_token=forged.token.value').expect(401);
    });
  });

  describe('POST /api/auth/login', () => {
    it('sets a secure httpOnly session cookie and returns the profile', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email: 'admin@example.com', password: TEST_PASSWORD })
        .expect(200);

      const cookie = sessionCookie(res.headers['set-cookie']);
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Strict/i);
      expect(cookie).toMatch(/Path=\/api/);
      expect(cookie).toMatch(/Max-Age=28800/);

      const user = res.body as User;
      expect(user).toMatchObject({ email: 'admin@example.com', name: 'Test Admin' });
      expect(user.lastLoginAt).not.toBeNull();
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('treats the email case-insensitively', async () => {
      await http()
        .post('/api/auth/login')
        .send({ email: 'ADMIN@Example.com', password: TEST_PASSWORD })
        .expect(200);
    });

    it.each([
      ['wrong password', 'admin@example.com', 'wrong-password'],
      ['unknown email', 'nobody@example.com', TEST_PASSWORD],
    ])('returns the same generic 401 for a %s', async (_case, email, password) => {
      const res = await http().post('/api/auth/login').send({ email, password }).expect(401);

      expect((res.body as ApiErrorResponse).message).toBe('Invalid email or password');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('validates the request body', async () => {
      const res = await http().post('/api/auth/login').send({ email: 'not-an-email' }).expect(400);

      expect(Array.isArray((res.body as ApiErrorResponse).message)).toBe(true);
    });
  });

  it('GET /api/auth/me returns the logged-in admin', async () => {
    const agent = await ctx.loginAs('admin@example.com');

    const res = await agent.get('/api/auth/me').expect(200);

    expect(res.body).toMatchObject({ email: 'admin@example.com' });
  });

  it('POST /api/auth/logout clears the session cookie', async () => {
    const agent = await ctx.loginAs('admin@example.com');

    const res = await agent.post('/api/auth/logout').expect(204);

    expect(sessionCookie(res.headers['set-cookie'])).toMatch(/access_token=;/);
    await agent.get('/api/auth/me').expect(401);
  });

  describe('PATCH /api/auth/me/password', () => {
    beforeAll(async () => {
      await ctx.createAdmin('changer@example.com');
    });

    it('rejects a wrong current password with 400 and keeps the session', async () => {
      const agent = await ctx.loginAs('changer@example.com');

      const res = await agent
        .patch('/api/auth/me/password')
        .send({ currentPassword: 'wrong-password', newPassword: 'brand-new-password' })
        .expect(400);

      expect((res.body as ApiErrorResponse).message).toBe('Current password is incorrect');
      await agent.get('/api/auth/me').expect(200);
    });

    it('rejects a new password that is too short', async () => {
      const agent = await ctx.loginAs('changer@example.com');

      await agent
        .patch('/api/auth/me/password')
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'short' })
        .expect(400);
    });

    it('changes the password, keeps this session and signs out other sessions', async () => {
      const current = await ctx.loginAs('changer@example.com');
      const otherDevice = await ctx.loginAs('changer@example.com');

      await current
        .patch('/api/auth/me/password')
        .send({ currentPassword: TEST_PASSWORD, newPassword: 'brand-new-password' })
        .expect(204);

      await current.get('/api/auth/me').expect(200);
      await otherDevice.get('/api/auth/me').expect(401);
      await http()
        .post('/api/auth/login')
        .send({ email: 'changer@example.com', password: TEST_PASSWORD })
        .expect(401);
      await ctx.loginAs('changer@example.com', 'brand-new-password');
    });
  });
});
