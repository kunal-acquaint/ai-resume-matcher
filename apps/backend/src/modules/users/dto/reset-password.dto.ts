import type { ResetPasswordRequest } from '@resume-matcher/shared';
import { IsNewPassword } from '../../../common/dto/password.decorator.js';

export class ResetPasswordDto implements ResetPasswordRequest {
  @IsNewPassword()
  newPassword: string;
}
