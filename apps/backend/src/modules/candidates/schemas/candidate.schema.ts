import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CANDIDATE_LIMITS, type SkillEvidence } from '@resume-matcher/shared';
import { type HydratedDocument, Schema as MongooseSchema, type Types } from 'mongoose';
import { COLLECTIONS } from '../../../common/collections.js';
import { Job } from '../../jobs/schemas/job.schema.js';
import { User } from '../../users/schemas/user.schema.js';

@Schema({ _id: false })
export class ResumeChunk {
  @Prop({ type: String, required: true })
  text: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];

  /** Similarity to the job's embedding at the last scoring. */
  @Prop({ type: Number, required: true })
  similarity: number;
}

export const ResumeChunkSchema = SchemaFactory.createForClass(ResumeChunk);

@Schema({ _id: false })
export class MatchedSkillEntry {
  @Prop({ type: String, required: true })
  skill: string;

  @Prop({ type: String, enum: ['text', 'alias', 'semantic'], required: true })
  evidence: SkillEvidence;

  @Prop({ type: String })
  term?: string;

  @Prop({ type: Number })
  similarity?: number;

  @Prop({ type: String })
  passage?: string;
}

export const MatchedSkillEntrySchema = SchemaFactory.createForClass(MatchedSkillEntry);

@Schema({ _id: false })
export class SkillMatchEntry {
  @Prop({ type: [MatchedSkillEntrySchema], default: [] })
  matched: MatchedSkillEntry[];

  @Prop({ type: [String], default: [] })
  missing: string[];
}

export const SkillMatchEntrySchema = SchemaFactory.createForClass(SkillMatchEntry);

@Schema({ collection: COLLECTIONS.candidates, timestamps: true })
export class Candidate {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Job.name, required: true })
  jobId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: CANDIDATE_LIMITS.nameMaxLength })
  candidateName: string;

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  candidateEmail: string | null;

  @Prop({ type: String, required: true })
  fileName: string;

  /** Extracted resume text. Excluded from queries unless explicitly selected. */
  @Prop({ type: String, required: true, select: false })
  text: string;

  /** SHA-256 of the normalized text, for per-job duplicate detection. */
  @Prop({ type: String, required: true })
  contentHash: string;

  /** Stored so scores can be recomputed when the job changes (spec §6). */
  @Prop({ type: [ResumeChunkSchema], default: [], select: false })
  chunks: ResumeChunk[];

  /** Model that produced the chunk embeddings; a mismatch triggers re-embedding. */
  @Prop({ type: String, required: true })
  embeddingModel: string;

  @Prop({ type: Number, required: true })
  semanticRaw: number;

  @Prop({ type: Number, required: true })
  semanticScore: number;

  @Prop({ type: SkillMatchEntrySchema, required: true })
  skillMatch: SkillMatchEntry;

  @Prop({ type: Number, required: true })
  coverage: number;

  @Prop({ type: Number, required: true })
  finalScore: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, default: null })
  uploadedBy: Types.ObjectId | null;

  createdAt: Date;
  updatedAt: Date;
}

export type CandidateDocument = HydratedDocument<Candidate>;

export const CandidateSchema = SchemaFactory.createForClass(Candidate);
CandidateSchema.index({ jobId: 1, contentHash: 1 }, { unique: true });
CandidateSchema.index({ jobId: 1, finalScore: -1 });
CandidateSchema.index({ createdAt: -1 });
CandidateSchema.index({ finalScore: -1 });
