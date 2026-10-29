import type { ConfigService } from '@nestjs/config';
import { HealthIndicatorService } from '@nestjs/terminus';
import type { Env } from '../../../config/env.schema.js';
import type { OllamaClient } from './ollama-client.js';
import { OllamaHealthIndicator } from './ollama-health.indicator.js';

describe('OllamaHealthIndicator', () => {
  const listModels = vi.fn<() => Promise<string[]>>();
  const config = { get: () => 'llama3.2:3b' } as unknown as ConfigService<Env, true>;
  const indicator = new OllamaHealthIndicator(
    { listModels } as unknown as OllamaClient,
    new HealthIndicatorService(),
    config,
  );

  beforeEach(() => {
    listModels.mockReset();
  });

  it('is up when the configured model is pulled', async () => {
    listModels.mockResolvedValue(['qwen3:4b', 'llama3.2:3b']);

    await expect(indicator.isHealthy('ollama')).resolves.toEqual({
      ollama: { status: 'up', model: 'llama3.2:3b' },
    });
  });

  it('is degraded with a hint when the model is not pulled', async () => {
    listModels.mockResolvedValue(['qwen3:4b']);

    await expect(indicator.isHealthy('ollama')).resolves.toEqual({
      ollama: {
        status: 'degraded',
        model: 'llama3.2:3b',
        message: 'Model not pulled. Run: ollama pull llama3.2:3b',
      },
    });
  });

  it('is degraded when Ollama is unreachable', async () => {
    listModels.mockRejectedValue(new Error('Cannot reach Ollama. Is Ollama running?'));

    await expect(indicator.isHealthy('ollama')).resolves.toMatchObject({
      ollama: { status: 'degraded', message: 'Cannot reach Ollama. Is Ollama running?' },
    });
  });
});
