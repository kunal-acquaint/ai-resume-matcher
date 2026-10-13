import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { ApiErrorResponse } from '@resume-matcher/shared';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import type { App } from 'supertest/types.js';

describe('App (e2e)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication<App>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    // Must be set before AppModule is imported: ConfigModule validates env on import.
    process.env.MONGODB_URI = mongo.getUri('resume-matcher-test');

    const { AppModule } = await import('../src/app.module.js');
    const { configureApp } = await import('../src/app.setup.js');

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
  });

  it('GET /api/health reports MongoDB as up', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', info: { mongodb: { status: 'up' } } });
  });

  it('returns unknown routes in the shared error format', async () => {
    const res = await request(app.getHttpServer()).get('/api/does-not-exist').expect(404);
    const body = res.body as ApiErrorResponse;

    expect(body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      path: '/api/does-not-exist',
    });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it('sets security headers', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('serves the OpenAPI document at /docs-json', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(res.body).toMatchObject({ info: { title: 'AI Resume Matcher API' } });
    expect(Object.keys(res.body.paths as object)).toContain('/api/health');
  });
});
