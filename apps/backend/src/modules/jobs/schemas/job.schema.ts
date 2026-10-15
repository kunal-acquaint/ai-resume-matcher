import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  JOB_LIMITS,
  JOB_STATUSES,
  SKILLS_STATUSES,
  type JobStatus,
  type SkillsStatus,
} from '@resume-matcher/shared';
import { type HydratedDocument, Schema as MongooseSchema, type Types } from 'mongoose';
import { COLLECTIONS } from '../../../common/collections.js';
import { User } from '../../users/schemas/user.schema.js';

@Schema({ _id: false })
export class RequiredSkillEntry {
  @Prop({ type: String, required: true, maxlength: JOB_LIMITS.skillNameMaxLength })
  name: string;

  @Prop({ type: [String], default: [] })
  aliases: string[];

  /** Embedding of the skill name, for semantic skill matching (spec §5.5). */
  @Prop({ type: [Number], default: [] })
  embedding: number[];

  @Prop({ type: String, enum: ['ai', 'manual'], required: true })
  source: 'ai' | 'manual';
}

export const RequiredSkillEntrySchema = SchemaFactory.createForClass(RequiredSkillEntry);

@Schema({ collection: COLLECTIONS.jobs, timestamps: true })
export class Job {
  @Prop({ type: String, required: true, trim: true, maxlength: JOB_LIMITS.titleMaxLength })
  title: string;

  @Prop({ type: String, required: true, maxlength: JOB_LIMITS.descriptionMaxLength })
  description: string;

  @Prop({ type: String, enum: JOB_STATUSES, default: 'active', index: true })
  status: JobStatus;

  /** Normalized mean of the description's chunk embeddings (spec §5.2). */
  @Prop({ type: [Number], required: true })
  embedding: number[];

  /** Model that produced `embedding` and the skill embeddings; a mismatch triggers re-embedding. */
  @Prop({ type: String, default: null })
  embeddingModel: string | null;

  @Prop({ type: [RequiredSkillEntrySchema], default: [] })
  requiredSkills: RequiredSkillEntry[];

  @Prop({ type: String, enum: SKILLS_STATUSES, required: true })
  skillsStatus: SkillsStatus;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, default: null })
  createdBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export type JobDocument = HydratedDocument<Job>;

export const JobSchema = SchemaFactory.createForClass(Job);
JobSchema.index({ createdAt: -1 });

/** Projection that leaves out the large embedding arrays. */
export const JOB_PUBLIC_FIELDS = '-embedding -requiredSkills.embedding';
