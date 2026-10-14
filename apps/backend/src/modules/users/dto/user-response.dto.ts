import { ApiProperty } from '@nestjs/swagger';
import type { User } from '@resume-matcher/shared';

/** Swagger documentation for the `User` response shape. */
export class UserResponseDto implements User {
  @ApiProperty({ example: '6720f1c2a1b2c3d4e5f60718' })
  id: string;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastLoginAt: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt: string;
}
