import { Inject, Logger, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import type { Env } from '../../config/env.schema.js';
import { DocumentEmbedder } from './embeddings/document-embedder.service.js';
import { EmbeddingHealthIndicator } from './embeddings/embedding-health.indicator.js';
import { HashingEmbedder } from './embeddings/hashing-embedder.js';
import { MiniLmEmbedder } from './embeddings/minilm-embedder.js';
import { TEXT_EMBEDDER, type TextEmbedder } from './embeddings/text-embedder.js';
import { LlmTaskQueue } from './llm-task-queue.service.js';
import { DictionarySkillExtractor } from './skills/dictionary-skill-extractor.js';
import { SKILL_EXTRACTOR, type SkillExtractor } from './skills/skill-extractor.js';

/**
 * AI building blocks behind interfaces (spec §5.6). `AI_PROVIDER` selects the
 * implementation; everything else depends only on the interfaces.
 */
@Module({
  imports: [TerminusModule],
  providers: [
    {
      provide: TEXT_EMBEDDER,
      inject: [ConfigService],
      // Async: with `local`, startup waits until the model is loaded (downloaded on first run).
      useFactory: (config: ConfigService<Env, true>): TextEmbedder | Promise<TextEmbedder> =>
        config.get('AI_PROVIDER', { infer: true }) === 'local'
          ? MiniLmEmbedder.load({
              model: config.get('EMBEDDING_MODEL', { infer: true }),
              cacheDir: config.get('MODEL_CACHE_DIR', { infer: true }),
            })
          : new HashingEmbedder(),
    },
    {
      provide: SKILL_EXTRACTOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): SkillExtractor => {
        if (config.get('AI_PROVIDER', { infer: true }) === 'local') {
          // The Ollama extractor arrives in milestone 10 (spec §15).
          new Logger(AiModule.name).warn(
            'Skill extraction still uses the dictionary stand-in; Ollama arrives in milestone 10.',
          );
        }
        return new DictionarySkillExtractor(config.get('AI_STUB_DELAY_MS', { infer: true }));
      },
    },
    DocumentEmbedder,
    EmbeddingHealthIndicator,
    LlmTaskQueue,
  ],
  exports: [DocumentEmbedder, EmbeddingHealthIndicator, SKILL_EXTRACTOR, LlmTaskQueue],
})
export class AiModule implements OnApplicationShutdown {
  constructor(@Inject(TEXT_EMBEDDER) private readonly embedder: TextEmbedder) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.embedder instanceof MiniLmEmbedder) {
      await this.embedder.dispose();
    }
  }
}
