import type { User } from '@resume-matcher/shared';
import type { UserDocument } from './schemas/user.schema.js';

/** Maps a user document to its public API shape (never exposes the password hash). */
export function toUserResponse(user: UserDocument): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
