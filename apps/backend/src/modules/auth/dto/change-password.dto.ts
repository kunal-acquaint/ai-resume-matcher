import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MAX_LENGTH, type ChangePasswordRequest } from '@resume-matcher/shared';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsNewPassword } from '../../../common/dto/password.decorator.js';

export class ChangePasswordDto implements ChangePasswordRequest {
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword: string;

  @IsNewPassword()
  newPassword: string;
}
