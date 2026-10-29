import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  type HealthCheckResult,
  HealthCheckService,
  type HealthIndicatorFunction,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import type { Env } from '../../config/env.schema.js';
import { EmbeddingHealthIndicator } from '../ai/embeddings/embedding-health.indicator.js';
import { OllamaHealthIndicator } from '../ai/ollama/ollama-health.indicator.js';
import { Public } from '../auth/decorators/public.decorator.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  private readonly checks: HealthIndicatorFunction[];

  constructor(
    private readonly health: HealthCheckService,
    mongoose: MongooseHealthIndicator,
    embeddings: EmbeddingHealthIndicator,
    ollama: OllamaHealthIndicator,
    config: ConfigService<Env, true>,
  ) {
    this.checks = [() => mongoose.pingCheck('mongodb'), () => embeddings.isHealthy('embeddings')];
    // Ollama is only used with the real AI.
    if (config.get('AI_PROVIDER', { infer: true }) === 'local') {
      this.checks.push(() => ollama.isHealthy('ollama'));
    }
  }

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check(this.checks);
  }
}
