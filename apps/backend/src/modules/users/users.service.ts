import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, mongo } from 'mongoose';
import { PasswordService } from './password.service.js';
import { User, type UserDocument } from './schemas/user.schema.js';

const DUPLICATE_KEY_ERROR = 11_000;

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly passwords: PasswordService,
  ) {}

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().sort({ createdAt: 1 }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  /** Includes the password hash; only for credential checks. */
  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.trim().toLowerCase() })
      .select('+passwordHash')
      .exec();
  }

  /** Includes the password hash; only for credential checks. */
  findByIdWithPassword(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+passwordHash').exec();
  }

  async create(input: CreateUserInput): Promise<UserDocument> {
    const email = input.email.trim().toLowerCase();
    if (await this.userModel.exists({ email })) {
      throw new ConflictException('An admin with this email already exists');
    }

    try {
      return await this.userModel.create({
        name: input.name.trim(),
        email,
        passwordHash: await this.passwords.hash(input.password),
      });
    } catch (error) {
      // Lost a race with a concurrent create of the same email.
      if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY_ERROR) {
        throw new ConflictException('An admin with this email already exists');
      }
      throw error;
    }
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('You cannot remove your own account');
    }
    const result = await this.userModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Admin not found');
    }
  }

  /** Resets another admin's password and signs them out everywhere. */
  async resetPassword(id: string, currentUserId: string, newPassword: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('Use change password to update your own password');
    }
    await this.setPassword(id, newPassword);
  }

  /**
   * Replaces the password hash and bumps `tokenVersion`, which invalidates all
   * existing sessions of that user. Returns the updated user.
   */
  async setPassword(id: string, newPassword: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        {
          $set: { passwordHash: await this.passwords.hash(newPassword) },
          $inc: { tokenVersion: 1 },
        },
        { returnDocument: 'after' },
      )
      .exec();
    if (!user) {
      throw new NotFoundException('Admin not found');
    }
    return user;
  }

  async recordLogin(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } }).exec();
  }
}
