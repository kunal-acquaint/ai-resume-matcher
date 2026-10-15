import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JOB_EVENTS, type JobEventPayload } from '../jobs/jobs.events.js';
import { CandidatesService } from './candidates.service.js';

/**
 * Keeps candidates in sync with their job. `suppressErrors: false` lets a
 * failure propagate to the request that changed the job instead of being hidden.
 */
@Injectable()
export class CandidatesJobListener {
  constructor(private readonly candidates: CandidatesService) {}

  @OnEvent(JOB_EVENTS.matchingInputsChanged, { suppressErrors: false })
  rescore({ jobId }: JobEventPayload): Promise<void> {
    return this.candidates.rescoreJob(jobId);
  }

  @OnEvent(JOB_EVENTS.deleted, { suppressErrors: false })
  removeCandidates({ jobId }: JobEventPayload): Promise<void> {
    return this.candidates.removeForJob(jobId);
  }
}
