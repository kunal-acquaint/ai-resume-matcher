import { createHash } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type {
  Candidate as CandidateResponse,
  CandidateSummary,
  Paginated,
} from '@resume-matcher/shared';
import { Model, mongo, type QueryFilter, Types } from 'mongoose';
import { escapeRegExp } from '../../common/utils/escape-regexp.js';
import {
  DocumentEmbedder,
  type EmbeddedChunk,
} from '../ai/embeddings/document-embedder.service.js';
import { normalizeForMatching } from '../ai/skills/term-matcher.js';
import { JobsService, type MatchableJob } from '../jobs/jobs.service.js';
import { PdfTextExtractor } from '../pdf/pdf-text-extractor.service.js';
import { toCandidateResponse, toCandidateSummary } from './candidates.mapper.js';
import type { ListCandidatesQueryDto, UploadCandidateDto } from './dto/candidate-request.dto.js';
import { type MatchResult, MatchingService } from './matching/matching.service.js';
import { Candidate, type CandidateDocument, type ResumeChunk } from './schemas/candidate.schema.js';

const DUPLICATE_KEY_ERROR = 11_000;
const DUPLICATE_RESUME = 'Resume already uploaded.';
/** Fields left out of API reads: large and only needed for (re)scoring. */
const HEAVY_FIELDS = '-text -chunks';

/** The parts of a Multer upload this service uses. */
export interface UploadedResume {
  originalname: string;
  buffer: Buffer;
}

function scoredFields(result: MatchResult, chunks: readonly EmbeddedChunk[]) {
  return {
    chunks: chunks.map((chunk, i) => ({
      text: chunk.text,
      embedding: chunk.embedding,
      similarity: result.chunkSimilarities[i] ?? 0,
    })),
    semanticRaw: result.semanticRaw,
    semanticScore: result.semanticScore,
    skillMatch: result.skillMatch,
    coverage: result.coverage,
    finalScore: result.finalScore,
  };
}

@Injectable()
export class CandidatesService {
  constructor(
    @InjectModel(Candidate.name) private readonly candidateModel: Model<Candidate>,
    private readonly jobs: JobsService,
    private readonly pdf: PdfTextExtractor,
    private readonly embedder: DocumentEmbedder,
    private readonly matching: MatchingService,
  ) {}

  /** Extracts, scores and stores a resume for a job (spec §5.1). Fully synchronous, no LLM. */
  async upload(
    jobId: string,
    file: UploadedResume,
    fields: UploadCandidateDto,
    uploadedBy: string,
  ): Promise<CandidateResponse> {
    const job = await this.jobs.findForMatching(jobId);
    if (job.status === 'closed') {
      throw new ConflictException('This job is closed');
    }
    if (job.skillsStatus !== 'ready') {
      throw new ConflictException('Required skills for this job are not ready yet');
    }

    const text = await this.pdf.extract(file.buffer);
    const contentHash = createHash('sha256').update(normalizeForMatching(text)).digest('hex');
    if (await this.candidateModel.exists({ jobId: job.id, contentHash })) {
      throw new ConflictException(DUPLICATE_RESUME);
    }

    const chunks = await this.embedder.embedChunks(text);
    const result = this.matching.evaluate(job, text, chunks);

    let candidate: CandidateDocument;
    try {
      candidate = await this.candidateModel.create({
        jobId: new Types.ObjectId(job.id),
        candidateName: fields.candidateName,
        candidateEmail: fields.candidateEmail ?? null,
        fileName: file.originalname,
        text,
        contentHash,
        embeddingModel: this.embedder.model,
        uploadedBy: new Types.ObjectId(uploadedBy),
        ...scoredFields(result, chunks),
      });
    } catch (error) {
      // Lost a race with a concurrent upload of the same resume.
      if (error instanceof mongo.MongoServerError && error.code === DUPLICATE_KEY_ERROR) {
        throw new ConflictException(DUPLICATE_RESUME);
      }
      throw error;
    }
    return this.findOne(candidate.id);
  }

  async list(query: ListCandidatesQueryDto): Promise<Paginated<CandidateSummary>> {
    const filter: QueryFilter<Candidate> = {};
    if (query.jobId) filter.jobId = new Types.ObjectId(query.jobId);
    if (query.search) {
      filter.candidateName = { $regex: escapeRegExp(query.search), $options: 'i' };
    }
    const sort: Record<string, 1 | -1> =
      query.sort === 'score' ? { finalScore: -1, createdAt: -1 } : { createdAt: -1 };

    const [total, candidates] = await Promise.all([
      this.candidateModel.countDocuments(filter).exec(),
      this.candidateModel
        .find(filter)
        .select(HEAVY_FIELDS)
        // oxlint-disable-next-line unicorn/no-array-sort -- Mongoose Query#sort, not Array#sort
        .sort(sort)
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .populate('jobId', 'title')
        .populate('uploadedBy', 'name')
        .exec(),
    ]);

    return {
      items: candidates.map(toCandidateSummary),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findOne(id: string): Promise<CandidateResponse> {
    const candidate = await this.candidateModel
      .findById(id)
      .select(HEAVY_FIELDS)
      .populate('jobId', 'title')
      .populate('uploadedBy', 'name')
      .exec();
    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }
    return toCandidateResponse(candidate);
  }

  async remove(id: string): Promise<void> {
    const result = await this.candidateModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Candidate not found');
    }
  }

  /**
   * Recomputes every candidate of a job after its description or skills changed.
   * Uses the stored chunk embeddings; resumes embedded by a different model are
   * re-embedded from their stored text first.
   */
  async rescoreJob(jobId: string): Promise<void> {
    const job: MatchableJob = await this.jobs.findForMatching(jobId);
    const candidates = await this.candidateModel
      .find({ jobId: job.id })
      .select('+text +chunks')
      .exec();

    for (const candidate of candidates) {
      const chunks: readonly EmbeddedChunk[] =
        candidate.embeddingModel === this.embedder.model
          ? candidate.chunks.map((chunk: ResumeChunk) => ({
              text: chunk.text,
              embedding: chunk.embedding,
            }))
          : await this.embedder.embedChunks(candidate.text);

      candidate.set({
        ...scoredFields(this.matching.evaluate(job, candidate.text, chunks), chunks),
        embeddingModel: this.embedder.model,
      });
      await candidate.save();
    }
  }

  async removeForJob(jobId: string): Promise<void> {
    await this.candidateModel.deleteMany({ jobId: new Types.ObjectId(jobId) }).exec();
  }
}
