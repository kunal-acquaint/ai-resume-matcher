import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@resume-matcher/shared';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { toUserResponse } from './users.mapper.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiCookieAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOkResponse({ type: [UserResponseDto] })
  async findAll(): Promise<User[]> {
    return (await this.users.findAll()).map(toUserResponse);
  }

  @Post()
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'An admin with this email already exists.' })
  async create(@Body() dto: CreateUserDto): Promise<User> {
    return toUserResponse(await this.users.create(dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Cannot remove your own account.' })
  @ApiNotFoundResponse()
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    return this.users.remove(id, currentUser.id);
  }

  @Patch(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: "Password reset; that admin's sessions are signed out." })
  @ApiBadRequestResponse({ description: 'Use change password for your own account.' })
  @ApiNotFoundResponse()
  resetPassword(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser() currentUser: User,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.users.resetPassword(id, currentUser.id, dto.newPassword);
  }
}
