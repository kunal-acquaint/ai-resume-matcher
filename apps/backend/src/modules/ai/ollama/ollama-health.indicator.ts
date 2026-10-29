import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import type { Env } from '../../../config/env.schema.js';
import { OllamaClient } from './ollama-client.js';

/**
 * Reports whether Ollama is reachable and the configured model is pulled.
 * Problems are `degraded`, not `down`: resume matching keeps working without
 * the LLM; only skill extraction needs it.
 */
@Injectable()
export class OllamaHealthIndicator {
  private readonly model: string;

  constructor(
    private readonly client: OllamaClient,
    private readonly healthIndicatorService: HealthIndicatorService,
    config: ConfigService<Env, true>,
  ) {
    this.model = config.get('OLLAMA_MODEL', { infer: true });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const models = await this.client.listModels();
      if (!models.includes(this.model)) {
        return indicator.degraded({
          model: this.model,
          message: `Model not pulled. Run: ollama pull ${this.model}`,
        });
      }
      return indicator.up({ model: this.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.degraded({ model: this.model, message });
    }
  }
}
