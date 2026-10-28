import type { ApiErrorResponse } from '@resume-matcher/shared';
import request from 'supertest';
import { createTestApp, type TestContext } from './utils/test-app.js';

describe('App (e2e)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestApp('app-e2e');
  });

  afterAll(async () => {
    await ctx?.close();
  });

  it('GET /api/health is public and reports MongoDB and the embedding model as up', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      info: {
        mongodb: { status: 'up' },
        embeddings: { status: 'up', model: 'hashing-stub' },
      },
    });
  });

  it('returns unknown routes in the shared error format', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/does-not-exist').expect(404);
    const body = res.body as ApiErrorResponse;

    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      path: '/api/does-not-exist',
    });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it('sets security headers', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('serves the OpenAPI document with cookie authentication', async () => {
    const res = await request(ctx.app.getHttpServer()).get('/docs-json').expect(200);

    expect(res.body).toMatchObject({
      info: { title: 'AI Resume Matcher API' },
      components: {
        securitySchemes: { cookie: { type: 'apiKey', in: 'cookie', name: 'access_token' } },
      },
    });
    expect(Object.keys(res.body.paths as object)).toEqual(
      expect.arrayContaining(['/api/health', '/api/auth/login', '/api/users']),
    );
  });
});
