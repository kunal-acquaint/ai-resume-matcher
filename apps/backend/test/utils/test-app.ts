import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import type { App } from 'supertest/types.js';
import { inject } from 'vitest';

export const TEST_PASSWORD = 'test-password-123';

export interface TestContext {
  app: INestApplication<App>;
  /** Creates an admin directly in the database. */
  createAdmin(
    email: string,
    password?: string,
    name?: string,
  ): Promise<{ id: string; email: string }>;
  /** Logs in and returns an agent that keeps the session cookie. */
  loginAs(email: string, password?: string): Promise<TestAgent>;
  /** Resolves once all queued LLM tasks (e.g. skill extraction) have finished. */
  waitForBackgroundTasks(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Boots the full application against the shared in-memory MongoDB, using a
 * dedicated database so test files can run in parallel.
 */
export async function createTestApp(
  database: string,
  env: Record<string, string> = {},
): Promise<TestContext> {
  // Must be set before AppModule is imported: ConfigModule validates env at import time.
  Object.assign(process.env, {
    MONGODB_URI: `${inject('mongoUri')}${database}`,
    JWT_SECRET: 'e2e-test-secret-that-is-at-least-32-characters',
    LOGIN_RATE_LIMIT: '1000',
    AI_PROVIDER: 'stub',
    AI_STUB_DELAY_MS: '0',
    ...env,
  });

  const { AppModule } = await import('../../src/app.module.js');
  const { configureApp } = await import('../../src/app.setup.js');
  const { UsersService } = await import('../../src/modules/users/users.service.js');
  const { LlmTaskQueue } = await import('../../src/modules/ai/llm-task-queue.service.js');

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();

  const users = app.get(UsersService);

  return {
    app,
    async createAdmin(email, password = TEST_PASSWORD, name = 'Test Admin') {
      const user = await users.create({ name, email, password });
      return { id: user.id, email: user.email };
    },
    async loginAs(email, password = TEST_PASSWORD) {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/api/auth/login').send({ email, password }).expect(200);
      return agent;
    },
    waitForBackgroundTasks: () => app.get(LlmTaskQueue).onIdle(),
    close: () => app.close(),
  };
}
