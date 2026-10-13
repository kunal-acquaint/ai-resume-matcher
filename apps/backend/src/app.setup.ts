import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Env } from './config/env.schema.js';

export const API_PREFIX = 'api';
export const DOCS_PATH = 'docs';

/**
 * Applies HTTP-level configuration that cannot be expressed through module
 * providers. Shared by `main.ts` and the e2e tests so both run the same setup.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }) });
  app.enableShutdownHooks();

  setupSwagger(app);
}

function setupSwagger(app: INestApplication): void {
  const document = new DocumentBuilder()
    .setTitle('AI Resume Matcher API')
    .setDescription('Semantic resume scoring and LLM-based skill gap analysis.')
    .setVersion('0.1.0')
    .build();

  SwaggerModule.setup(DOCS_PATH, app, () => SwaggerModule.createDocument(app, document));
}
