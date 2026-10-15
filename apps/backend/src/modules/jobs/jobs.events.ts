/** Events published by the jobs module; listeners run before the request completes (`emitAsync`). */
export const JOB_EVENTS = {
  /** The description or required skills changed, so candidate scores must be recomputed. */
  matchingInputsChanged: 'job.matching-inputs-changed',
  deleted: 'job.deleted',
} as const;

export interface JobEventPayload {
  jobId: string;
}
