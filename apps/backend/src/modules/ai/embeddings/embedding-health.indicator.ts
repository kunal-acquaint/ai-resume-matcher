import { Inject, Injectable } from '@nestjs/common';
import { type HealthIndicatorResult, HealthIndicatorService } from '@nestjs/terminus';
import { TEXT_EMBEDDER, type TextEmbedder } from './text-embedder.js';

/** Reports whether the embedding model answers, by embedding a short probe text. */
@Injectable()
export class EmbeddingHealthIndicator {
  constructor(
    @Inject(TEXT_EMBEDDER) private readonly embedder: TextEmbedder,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    try {
      const [vector] = await this.embedder.embed(['health check']);
      if (vector?.length !== this.embedder.dimensions) {
        return indicator.down({ model: this.embedder.model, message: 'Unexpected vector size' });
      }
      return indicator.up({ model: this.embedder.model });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return indicator.down({ model: this.embedder.model, message });
    }
  }
}
