import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { DashboardStats } from '@resume-matcher/shared';
import type { Model } from 'mongoose';
import { Candidate } from '../candidates/schemas/candidate.schema.js';
import { Job } from '../jobs/schemas/job.schema.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Job.name) private readonly jobModel: Model<Job>,
    @InjectModel(Candidate.name) private readonly candidateModel: Model<Candidate>,
  ) {}

  async getStats(now = new Date()): Promise<DashboardStats> {
    const weekAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

    const [activeJobs, totalResumes, resumesThisWeek, [average]] = await Promise.all([
      this.jobModel.countDocuments({ status: 'active' }).exec(),
      this.candidateModel.countDocuments().exec(),
      this.candidateModel.countDocuments({ createdAt: { $gte: weekAgo } }).exec(),
      this.candidateModel
        .aggregate<{ value: number }>([{ $group: { _id: null, value: { $avg: '$finalScore' } } }])
        .exec(),
    ]);

    return { activeJobs, totalResumes, resumesThisWeek, averageScore: average?.value ?? null };
  }
}
