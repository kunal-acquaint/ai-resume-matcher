import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ collection: 'users', timestamps: true })
export class User {
  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string;

  /** argon2id hash. Excluded from queries unless explicitly selected. */
  @Prop({ type: String, required: true, select: false })
  passwordHash: string;

  /** Incremented on password change/reset; sessions carrying an older value are rejected. */
  @Prop({ type: Number, required: true, default: 0 })
  tokenVersion: number;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export const UserSchema = SchemaFactory.createForClass(User);
