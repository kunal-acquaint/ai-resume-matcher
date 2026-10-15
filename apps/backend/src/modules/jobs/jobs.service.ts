import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import type {
  Job as JobResponse,
  JobStatus,
  Paginated,
  RequiredSkillInput,
  SkillsStatus,
} from '@resume-matcher/shared';
import { type Connection, Model, type QueryFilter, Types } from 'mongoose';
import { COLLECTIONS } from '../../common/collections.js';
import { escapeRegExp } from '../../common/utils/escape-regexp.js';
import { DocumentEmbedder } from '../ai/embeddings/document-embedder.service.js';
import { LlmTaskQueue } from '../ai/llm-task-queue.service.js';
import { normalizeSkills } from '../ai/skills/normalize-skills.js';
import { SKILL_EXTRACTOR, type SkillExtractor } from '../ai/skills/skill-extractor.js';
import type { CreateJobDto, ListJobsQueryDto, UpdateJobDto } from './dto/job-request.dto.js';
import { JOB_EVENTS, type JobEventPayload } from './jobs.events.js';
import { toJobResponse } from './jobs.mapper.js';
import {
  Job,
  JOB_PUBLIC_FIELDS,
  type JobDocument,
  type RequiredSkillEntry,
} from './schemas/job.schema.js';

const EXTRACTION_IN_PROGRESS =
  'Required skills are still being extracted for this job. Try again when extraction finishes.';

/** A job with the embeddings needed to score resumes against it. */
export interface MatchableJob {
  id: string;
  status: JobStatus;
  skillsStatus: SkillsStatus;
  embedding: number[];
  requiredSkills: RequiredSkillEntry[];
}

@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    @InjectConnection() private readonly connection: Connection,
    private readonly embedder: DocumentEmbedder,
    @Inject(SKILL_EXTRACTOR) private readonly skillExtractor: SkillExtractor,
    private readonly llmTasks: LlmTaskQueue,
    private readonly events: EventEmitter2,
  ) {}

  /** Extractions interrupted by a restart can never finish; mark them failed so they can be retried. */
  async onApplicationBootstrap(): Promise<void> {
    const { modifiedCount } = await this.jobModel
      .updateMany({ skillsStatus: 'extracting' }, { $set: { skillsStatus: 'failed' } })
      .exec();
    if (modifiedCount > 0) {
      this.logger.warn(`Marked ${modifiedCount} interrupted skill extraction(s) as failed`);
    }
  }

  async list(query: ListJobsQueryDto): Promise<Paginated<JobResponse>> {
    const filter: QueryFilter<Job> = {};
    if (query.status) filter.status = query.status;
    if (query.search) filter.title = { $regex: escapeRegExp(query.search), $options: 'i' };

    const [total, jobs] = await Promise.all([
      this.jobModel.countDocuments(filter).exec(),
      this.jobModel
        .find(filter)
        .select(JOB_PUBLIC_FIELDS)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .populate('createdBy', 'name')
        .exec(),
    ]);

    const counts = await this.countCandidates(jobs.map((job) => job._id));
    return {
      items: jobs.map((job) => toJobResponse(job, counts.get(job.id) ?? 0)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: string): Promise<JobResponse> {
    const job = await this.jobModel
      .findById(id)
      .select(JOB_PUBLIC_FIELDS)
      .populate('createdBy', 'name')
      .exec();
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    const counts = await this.countCandidates([job._id]);
    return toJobResponse(job, counts.get(job.id) ?? 0);
  }

  /**
   * Loads a job with its embeddings for scoring. If they were produced by a
   * different embedding model (e.g. after switching AI_PROVIDER), they are
   * recomputed first, because vectors from different models are not comparable.
   */
  async findForMatching(id: string): Promise<MatchableJob> {
    const job = await this.findDocument(id);
    if (job.embeddingModel !== this.embedder.model) {
      job.embedding = await this.embedder.embedDocument(job.description);
      const embeddings = await this.embedder.embedTexts(job.requiredSkills.map((s) => s.name));
      job.requiredSkills = job.requiredSkills.map((skill, i) => ({
        name: skill.name,
        aliases: [...skill.aliases],
        source: skill.source,
        embedding: embeddings[i] ?? [],
      }));
      job.embeddingModel = this.embedder.model;
      await job.save();
    }
    return {
      id: job.id,
      status: job.status,
      skillsStatus: job.skillsStatus,
      embedding: job.embedding,
      requiredSkills: job.requiredSkills,
    };
  }

  async create(dto: CreateJobDto, createdBy: string): Promise<JobResponse> {
    const job = await this.jobModel.create({
      title: dto.title,
      description: dto.description,
      embedding: await this.embedder.embedDocument(dto.description),
      embeddingModel: this.embedder.model,
      skillsStatus: 'extracting',
      createdBy: new Types.ObjectId(createdBy),
    });
    this.queueSkillExtraction(job.id);
    return this.findOne(job.id);
  }

  async update(id: string, dto: UpdateJobDto): Promise<JobResponse> {
    const job = await this.findDocument(id);

    const changesSkillInputs = dto.description !== undefined || dto.requiredSkills !== undefined;
    if (changesSkillInputs && job.skillsStatus === 'extracting') {
      throw new ConflictException(EXTRACTION_IN_PROGRESS);
    }

    let matchingInputsChanged = false;
    if (dto.title !== undefined) job.title = dto.title;
    if (dto.status !== undefined) job.status = dto.status;
    if (dto.description !== undefined && dto.description !== job.description) {
      job.description = dto.description;
      job.embedding = await this.embedder.embedDocument(dto.description);
      matchingInputsChanged = true;
    }
    if (dto.requiredSkills !== undefined) {
      job.requiredSkills = await this.buildSkillEntries(dto.requiredSkills, job.requiredSkills);
      job.skillsStatus = 'ready';
      matchingInputsChanged = true;
    }

    await job.save();
    if (matchingInputsChanged) {
      await this.publish(JOB_EVENTS.matchingInputsChanged, id);
    }
    return this.findOne(id);
  }

  /** Re-runs AI skill extraction, replacing the current skills when it finishes. */
  async requestSkillExtraction(id: string): Promise<JobResponse> {
    const job = await this.jobModel
      .findOneAndUpdate(
        { _id: id, skillsStatus: { $ne: 'extracting' } },
        { $set: { skillsStatus: 'extracting' } },
      )
      .exec();
    if (!job) {
      await this.findDocument(id); // 404 if the job doesn't exist
      throw new ConflictException(EXTRACTION_IN_PROGRESS);
    }
    this.queueSkillExtraction(id);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const job = await this.jobModel.findByIdAndDelete(id).exec();
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    await this.publish(JOB_EVENTS.deleted, id);
  }

  private async findDocument(id: string): Promise<JobDocument> {
    const job = await this.jobModel.findById(id).exec();
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  /** Publishes a job event and waits for all listeners (e.g. candidate rescoring) to finish. */
  private async publish(event: string, jobId: string): Promise<void> {
    const payload: JobEventPayload = { jobId };
    await this.events.emitAsync(event, payload);
  }

  private queueSkillExtraction(jobId: string): void {
    this.llmTasks.enqueue(`Skill extraction for job ${jobId}`, () =>
      this.runSkillExtraction(jobId),
    );
  }

  private async runSkillExtraction(jobId: string): Promise<void> {
    const job = await this.jobModel.findById(jobId).select('description skillsStatus').exec();
    // Deleted or no longer waiting for extraction (e.g. marked failed after a restart).
    if (!job || job.skillsStatus !== 'extracting') {
      return;
    }

    let saved = false;
    try {
      const extracted = await this.skillExtractor.extract(job.description);
      const skills = normalizeSkills(extracted, { enrichFromDictionary: true });
      if (skills.length === 0) {
        throw new Error('No skills were extracted from the job description');
      }
      const embeddings = await this.embedder.embedTexts(skills.map((skill) => skill.name));
      const requiredSkills: RequiredSkillEntry[] = skills.map((skill, i) => ({
        ...skill,
        embedding: embeddings[i] ?? [],
        source: 'ai',
      }));

      const result = await this.jobModel
        .updateOne(
          { _id: jobId, skillsStatus: 'extracting' },
          { $set: { requiredSkills, skillsStatus: 'ready' } },
        )
        .exec();
      saved = result.modifiedCount === 1;
    } catch (error) {
      await this.jobModel
        .updateOne({ _id: jobId, skillsStatus: 'extracting' }, { $set: { skillsStatus: 'failed' } })
        .exec();
      throw error;
    }

    // Re-extraction on a job that already has candidates changes their scores.
    if (saved) {
      await this.publish(JOB_EVENTS.matchingInputsChanged, jobId);
    }
  }

  /**
   * Normalizes manually edited skills and embeds their names. Skills that were
   * already on the job keep their source; new ones are marked manual.
   */
  private async buildSkillEntries(
    inputs: RequiredSkillInput[],
    existing: RequiredSkillEntry[],
  ): Promise<RequiredSkillEntry[]> {
    const skills = normalizeSkills(inputs, { enrichFromDictionary: false });
    const embeddings = await this.embedder.embedTexts(skills.map((skill) => skill.name));
    const previousSource = new Map(
      existing.map((skill) => [skill.name.toLowerCase(), skill.source]),
    );

    return skills.map((skill, i) => ({
      ...skill,
      embedding: embeddings[i] ?? [],
      source: previousSource.get(skill.name.toLowerCase()) ?? 'manual',
    }));
  }

  private async countCandidates(jobIds: Types.ObjectId[]): Promise<Map<string, number>> {
    if (jobIds.length === 0) {
      return new Map();
    }
    const rows = await this.connection
      .collection(COLLECTIONS.candidates)
      .aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { jobId: { $in: jobIds } } },
        { $group: { _id: '$jobId', count: { $sum: 1 } } },
      ])
      .toArray();
    return new Map(rows.map((row) => [row._id.toString(), row.count]));
  }
}
