import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@resume-matcher/shared';
import { IsString, Length } from 'class-validator';

/** Validation + docs for a new password, enforcing the shared length policy. */
export function IsNewPassword(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({
      minLength: PASSWORD_MIN_LENGTH,
      maxLength: PASSWORD_MAX_LENGTH,
      format: 'password',
    }),
    IsString(),
    Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
      message: `password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    }),
  );
}
