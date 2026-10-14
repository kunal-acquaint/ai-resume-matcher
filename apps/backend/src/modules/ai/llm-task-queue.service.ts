import { Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import PQueue from 'p-queue';

/**
 * Runs LLM work one task at a time (spec §3.2): the local model uses the whole
 * CPU, so parallel tasks would only make every task slower. Tasks are expected
 * to handle their own failures; errors reaching the queue are only logged.
 */
@Injectable()
export class LlmTaskQueue implements OnApplicationShutdown {
  private readonly logger = new Logger(LlmTaskQueue.name);
  private readonly queue = new PQueue({ concurrency: 1 });

  enqueue(name: string, task: () => Promise<void>): void {
    void this.queue.add(async () => {
      const startedAt = performance.now();
      try {
        await task();
        this.logger.log(`${name} finished in ${Math.round(performance.now() - startedAt)} ms`);
      } catch (error) {
        this.logger.error(`${name} failed`, error instanceof Error ? error.stack : String(error));
      }
    });
  }

  /** Number of tasks waiting plus running. */
  get size(): number {
    return this.queue.size + this.queue.pending;
  }

  /** Resolves when all queued tasks have finished (used by tests). */
  onIdle(): Promise<void> {
    return this.queue.onIdle();
  }

  onApplicationShutdown(): void {
    // Drop waiting tasks; their records are marked failed on the next startup.
    this.queue.clear();
  }
}
