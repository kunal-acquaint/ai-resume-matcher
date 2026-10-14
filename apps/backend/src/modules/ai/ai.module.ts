import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema.js';
import { DocumentEmbedder } from './embeddings/document-embedder.service.js';
import { HashingEmbedder } from './embeddings/hashing-embedder.js';
import { TEXT_EMBEDDER, type TextEmbedder } from './embeddings/text-embedder.js';
import { LlmTaskQueue } from './llm-task-queue.service.js';
import { DictionarySkillExtractor } from './skills/dictionary-skill-extractor.js';
import { SKILL_EXTRACTOR, type SkillExtractor } from './skills/skill-extractor.js';

function assertStubProvider(config: ConfigService<Env, true>): void {
  if (config.get('AI_PROVIDER', { infer: true }) !== 'stub') {
    // Real implementations arrive in milestones 9-10 (spec §15).
    throw new Error('AI_PROVIDER=local is not implemented yet. Use AI_PROVIDER=stub.');
  }
}

/**
 * AI building blocks behind interfaces (spec §5.6). `AI_PROVIDER` selects the
 * implementation; everything else depends only on the interfaces.
 */
@Module({
  providers: [
    {
      provide: TEXT_EMBEDDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): TextEmbedder => {
        assertStubProvider(config);
        return new HashingEmbedder();
      },
    },
    {
      provide: SKILL_EXTRACTOR,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>): SkillExtractor => {
        assertStubProvider(config);
        return new DictionarySkillExtractor(config.get('AI_STUB_DELAY_MS', { infer: true }));
      },
    },
    DocumentEmbedder,
    LlmTaskQueue,
  ],
  exports: [DocumentEmbedder, SKILL_EXTRACTOR, LlmTaskQueue],
})
export class AiModule {}
