import { setTimeout as sleep } from 'node:timers/promises';
import { Logger } from '@nestjs/common';
import { LlmTaskQueue } from './llm-task-queue.service.js';

describe('LlmTaskQueue', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('runs tasks one at a time, in order', async () => {
    const queue = new LlmTaskQueue();
    const events: string[] = [];
    const task = (name: string) => async () => {
      events.push(`${name}:start`);
      await sleep(10);
      events.push(`${name}:end`);
    };

    queue.enqueue('a', task('a'));
    queue.enqueue('b', task('b'));
    expect(queue.size).toBe(2);
    await queue.onIdle();

    expect(events).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
    expect(queue.size).toBe(0);
  });

  it('logs a failing task and continues with the next one', async () => {
    const queue = new LlmTaskQueue();
    const next = vi.fn().mockResolvedValue(undefined);

    queue.enqueue('failing', () => Promise.reject(new Error('boom')));
    queue.enqueue('next', next);
    await queue.onIdle();

    expect(errorSpy).toHaveBeenCalledWith('failing failed', expect.stringContaining('boom'));
    expect(next).toHaveBeenCalledOnce();
  });
});
