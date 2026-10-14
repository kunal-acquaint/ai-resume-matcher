import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import type { Env } from '../../config/env.schema.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthGuard } from './guards/auth.guard.js';
import { SessionCookieService } from './session-cookie.service.js';

const ONE_MINUTE_MS = 60_000;

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
        },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    // Only applied where `ThrottlerGuard` is used explicitly (the login route).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: [
          { ttl: ONE_MINUTE_MS, limit: config.get('LOGIN_RATE_LIMIT', { infer: true }) },
        ],
        errorMessage: 'Too many login attempts. Please try again in a minute.',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionCookieService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AuthModule {}
