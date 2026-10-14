import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@resume-matcher/shared';
import { isEmail } from 'class-validator';
import type { Env } from '../../config/env.schema.js';
import { UsersService } from './users.service.js';

/** Placeholder shipped in `.env.example`; refusing it prevents a well-known admin password. */
const EXAMPLE_PASSWORD = 'change-me-now';

export type SeedResult = { status: 'created' | 'exists'; email: string };

export class SeedConfigError extends Error {}

/** Creates the first admin from ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD. Idempotent. */
@Injectable()
export class AdminSeeder {
  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async seed(): Promise<SeedResult> {
    const name = this.config.get('ADMIN_NAME', { infer: true });
    const email = this.config.get('ADMIN_EMAIL', { infer: true })?.toLowerCase();
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });

    const problems: string[] = [];
    if (!name) problems.push('ADMIN_NAME is required');
    if (!email || !isEmail(email)) problems.push('ADMIN_EMAIL must be a valid email address');
    if (
      !password ||
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      problems.push(
        `ADMIN_PASSWORD must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
      );
    } else if (password === EXAMPLE_PASSWORD) {
      problems.push('ADMIN_PASSWORD must be changed from the example value');
    }
    if (problems.length > 0 || !name || !email || !password) {
      throw new SeedConfigError(problems.join('\n'));
    }

    try {
      await this.users.create({ name, email, password });
      return { status: 'created', email };
    } catch (error) {
      if (error instanceof ConflictException) {
        return { status: 'exists', email };
      }
      throw error;
    }
  }
}
