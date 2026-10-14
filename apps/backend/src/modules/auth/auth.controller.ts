import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { User } from '@resume-matcher/shared';
import type { Response } from 'express';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { toUserResponse } from '../users/users.mapper.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SessionCookieService } from './session-cookie.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessionCookie: SessionCookieService,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserResponseDto, description: 'Sets the session cookie.' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts.' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const user = await this.auth.login(dto.email, dto.password);
    this.sessionCookie.set(response, await this.auth.createSessionToken(user));
    return toUserResponse(user);
  }

  // Public so a stale or invalid cookie can always be cleared.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Clears the session cookie.' })
  logout(@Res({ passthrough: true }) response: Response): void {
    this.sessionCookie.clear(response);
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not logged in or session revoked.' })
  me(@CurrentUser() user: User): User {
    return user;
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiNoContentResponse({ description: 'Password changed; other sessions are signed out.' })
  @ApiBadRequestResponse({ description: 'Current password is incorrect or new password invalid.' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const updated = await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword);
    // The password change revoked every session, including this one; keep this one alive.
    this.sessionCookie.set(response, await this.auth.createSessionToken(updated));
  }
}
