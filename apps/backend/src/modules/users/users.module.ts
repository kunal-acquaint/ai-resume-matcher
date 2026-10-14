import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSeeder } from './admin-seeder.js';
import { PasswordService } from './password.service.js';
import { User, UserSchema } from './schemas/user.schema.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UsersController],
  providers: [UsersService, PasswordService, AdminSeeder],
  exports: [UsersService, PasswordService],
})
export class UsersModule {}
