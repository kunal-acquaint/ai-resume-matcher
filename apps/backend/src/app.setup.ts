import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { API_PREFIX, DOCS_PATH } from './app.constants.js';
import type { Env } from './config/env.schema.js';
import { SESSION_COOKIE } from './modules/auth/auth.constants.js';

/**
 * Applies HTTP-level configuration that cannot be expressed through module
 * providers. Shared by `main.ts` and the e2e tests so both run the same setup.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.setGlobalPrefix(API_PREFIX);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get('CORS_ORIGIN', { infer: true }), credentials: true });
  app.enableShutdownHooks();

  setupSwagger(app);
}

function setupSwagger(app: INestApplication): void {
  const document = new DocumentBuilder()
    .setTitle('AI Resume Matcher API')
    .setDescription(
      'Semantic resume scoring and LLM-based skill gap analysis. ' +
        'Log in with `POST /api/auth/login`; the session cookie is then sent automatically.',
    )
    .setVersion('0.1.0')
    .addCookieAuth(SESSION_COOKIE)
    .build();

  SwaggerModule.setup(DOCS_PATH, app, () => SwaggerModule.createDocument(app, document));
}
