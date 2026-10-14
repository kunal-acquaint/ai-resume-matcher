import type { ApiErrorResponse, User } from '@resume-matcher/shared';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { createTestApp, TEST_PASSWORD, type TestContext } from './utils/test-app.js';

describe('Users (e2e)', () => {
  let ctx: TestContext;
  let admin: TestAgent;
  let adminId: string;

  beforeAll(async () => {
    ctx = await createTestApp('users-e2e');
    adminId = (await ctx.createAdmin('admin@example.com')).id;
    admin = await ctx.loginAs('admin@example.com');
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('requires authentication', async () => {
    await request(ctx.app.getHttpServer()).get('/api/users').expect(401);
  });

  it('GET /api/users lists admins without password hashes', async () => {
    const res = await admin.get('/api/users').expect(200);
    const users = res.body as User[];

    expect(users.map((u) => u.email)).toContain('admin@example.com');
    for (const user of users) {
      expect(Object.keys(user).toSorted()).toEqual([
        'createdAt',
        'email',
        'id',
        'lastLoginAt',
        'name',
      ]);
    }
  });

  describe('POST /api/users', () => {
    it('creates an admin who can then log in', async () => {
      const res = await admin
        .post('/api/users')
        .send({ name: '  New Admin  ', email: 'New@Example.com', password: 'new-admin-password' })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'New Admin',
        email: 'new@example.com',
        lastLoginAt: null,
      });
      await ctx.loginAs('new@example.com', 'new-admin-password');
    });

    it('rejects a duplicate email regardless of case with 409', async () => {
      const res = await admin
        .post('/api/users')
        .send({ name: 'Dup', email: 'ADMIN@example.com', password: 'another-password' })
        .expect(409);

      expect((res.body as ApiErrorResponse).message).toBe(
        'An admin with this email already exists',
      );
    });

    it.each([
      [{ name: '', email: 'a@example.com', password: 'long-enough-pw' }],
      [{ name: 'A', email: 'not-an-email', password: 'long-enough-pw' }],
      [{ name: 'A', email: 'a@example.com', password: 'short' }],
      [{ name: 'A', email: 'a@example.com', password: 'long-enough-pw', role: 'superadmin' }],
    ])('rejects invalid input %o with 400', async (body) => {
      await admin.post('/api/users').send(body).expect(400);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('refuses to remove your own account', async () => {
      const res = await admin.delete(`/api/users/${adminId}`).expect(400);

      expect((res.body as ApiErrorResponse).message).toBe('You cannot remove your own account');
    });

    it('removes another admin and signs them out immediately', async () => {
      const { id } = await ctx.createAdmin('to-remove@example.com');
      const removedSession = await ctx.loginAs('to-remove@example.com');

      await admin.delete(`/api/users/${id}`).expect(204);

      await removedSession.get('/api/auth/me').expect(401);
      await admin.delete(`/api/users/${id}`).expect(404);
    });

    it('rejects a malformed id with 400', async () => {
      await admin.delete('/api/users/not-an-id').expect(400);
    });
  });

  describe('PATCH /api/users/:id/password', () => {
    it("resets another admin's password and revokes their sessions", async () => {
      const { id } = await ctx.createAdmin('forgetful@example.com');
      const oldSession = await ctx.loginAs('forgetful@example.com');

      await admin
        .patch(`/api/users/${id}/password`)
        .send({ newPassword: 'reset-password-1' })
        .expect(204);

      await oldSession.get('/api/auth/me').expect(401);
      await request(ctx.app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'forgetful@example.com', password: TEST_PASSWORD })
        .expect(401);
      await ctx.loginAs('forgetful@example.com', 'reset-password-1');
    });

    it('refuses to reset your own password through this route', async () => {
      await admin
        .patch(`/api/users/${adminId}/password`)
        .send({ newPassword: 'whatever-123' })
        .expect(400);
    });

    it('returns 404 for an unknown admin', async () => {
      await admin
        .patch('/api/users/6720f1c2a1b2c3d4e5f60718/password')
        .send({ newPassword: 'whatever-123' })
        .expect(404);
    });
  });
});
