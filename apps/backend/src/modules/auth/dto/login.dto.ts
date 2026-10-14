import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_MAX_LENGTH, type LoginRequest } from '@resume-matcher/shared';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @MaxLength(254)
  email: string;

  // No minimum length here: login must not reveal the password policy of existing accounts.
  @ApiProperty({ format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
