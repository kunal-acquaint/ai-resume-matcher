import { ApiProperty } from '@nestjs/swagger';
import type { CreateUserRequest } from '@resume-matcher/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { IsNewPassword } from '../../../common/dto/password.decorator.js';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUserDto implements CreateUserRequest {
  @ApiProperty({ example: 'Jane Doe', maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  @Transform(trim)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsNewPassword()
  password: string;
}
