import type { User } from '@resume-matcher/shared';
import type { Request } from 'express';

/** Request after the auth guard has verified the session and attached the admin. */
export interface AuthenticatedRequest extends Request {
  user: User;
}
