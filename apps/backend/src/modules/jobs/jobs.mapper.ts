import type { Job } from '@resume-matcher/shared';
import type { Types } from 'mongoose';
import type { JobDocument } from './schemas/job.schema.js';

interface PopulatedCreator {
  _id: Types.ObjectId;
  name: string;
}

function isPopulatedCreator(value: unknown): value is PopulatedCreator {
  return typeof value === 'object' && value !== null && 'name' in value && '_id' in value;
}

/** Maps a job document (with `createdBy` populated) to its API shape, without embeddings. */
export function toJobResponse(job: JobDocument, candidateCount: number): Job {
  const creator: unknown = job.createdBy;
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    status: job.status,
    requiredSkills: job.requiredSkills.map(({ name, aliases, source }) => ({
      name,
      aliases: [...aliases],
      source,
    })),
    skillsStatus: job.skillsStatus,
    candidateCount,
    createdBy: isPopulatedCreator(creator)
      ? { id: creator._id.toString(), name: creator.name }
      : null,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
