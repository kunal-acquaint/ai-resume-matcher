import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { API_PREFIX } from '../../app.constants.js';
import type { Env } from '../../config/env.schema.js';
import { SESSION_COOKIE } from './auth.constants.js';

/** Writes and clears the httpOnly session cookie with consistent security attributes. */
@Injectable()
export class SessionCookieService {
  private readonly options: CookieOptions;
  private readonly maxAgeMs: number;

  constructor(config: ConfigService<Env, true>) {
    this.options = {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.get('NODE_ENV', { infer: true }) === 'production',
      path: `/${API_PREFIX}`,
    };
    this.maxAgeMs = config.get('JWT_EXPIRES_IN', { infer: true }) * 1000;
  }

  set(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE, token, { ...this.options, maxAge: this.maxAgeMs });
  }

  clear(response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.options);
  }
}
