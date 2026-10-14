import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  type OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { isValidObjectId } from 'mongoose';
import { PasswordService } from '../users/password.service.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import { UsersService } from '../users/users.service.js';

/** JWT claims: `sub` = user id, `tv` = the user's tokenVersion when the session was issued. */
interface SessionPayload {
  sub: string;
  tv: number;
}

function isSessionPayload(value: unknown): value is SessionPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'sub' in value &&
    'tv' in value &&
    typeof value.sub === 'string' &&
    typeof value.tv === 'number'
  );
}

@Injectable()
export class AuthService implements OnModuleInit {
  /** Verified against when the email is unknown, so response time doesn't reveal which emails exist. */
  private dummyHash = '';

  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.passwords.hash(randomUUID());
  }

  async login(email: string, password: string): Promise<UserDocument> {
    const user = await this.users.findByEmailWithPassword(email);
    const passwordMatches = await this.passwords.verify(
      user?.passwordHash ?? this.dummyHash,
      password,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.users.recordLogin(user.id);
    user.lastLoginAt = new Date();
    return user;
  }

  /**
   * Changes the logged-in admin's own password. All of their sessions are revoked;
   * the caller issues a fresh session for the current request from the returned user.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<UserDocument> {
    const user = await this.users.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('Admin not found');
    }
    // 400 rather than 401: a wrong current password must not log the admin out in the UI.
    if (!(await this.passwords.verify(user.passwordHash, currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from the current one');
    }
    return this.users.setPassword(userId, newPassword);
  }

  createSessionToken(user: UserDocument): Promise<string> {
    const payload: SessionPayload = { sub: user.id, tv: user.tokenVersion };
    return this.jwt.signAsync(payload);
  }

  /** Returns the session's user, or null if the token is invalid, expired or revoked. */
  async verifySession(token: string): Promise<UserDocument | null> {
    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync<object>(token);
    } catch {
      return null;
    }
    if (!isSessionPayload(payload) || !isValidObjectId(payload.sub)) {
      return null;
    }

    const user = await this.users.findById(payload.sub);
    // Missing user = admin was removed; version mismatch = password changed or reset since login.
    if (!user || user.tokenVersion !== payload.tv) {
      return null;
    }
    return user;
  }
}
