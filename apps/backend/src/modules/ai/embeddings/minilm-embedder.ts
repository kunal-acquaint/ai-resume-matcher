import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { env, type FeatureExtractionPipeline, pipeline } from '@huggingface/transformers';
import PQueue from 'p-queue';
import type { TextEmbedder } from './text-embedder.js';

/** Output size of all-MiniLM-L6-v2. */
const DIMENSIONS = 384;

/** Texts per model call; keeps peak memory low for long documents. */
const BATCH_SIZE = 16;

/** Splits the pooled output (a flat `[count, 384]` float tensor) into one vector per text. */
function toVectors(data: unknown, count: number): number[][] {
  if (!(data instanceof Float32Array) || data.length !== count * DIMENSIONS) {
    throw new Error(`Unexpected embedding output for ${count} texts`);
  }
  return Array.from({ length: count }, (_, i) =>
    Array.from(data.subarray(i * DIMENSIONS, (i + 1) * DIMENSIONS)),
  );
}

export interface MiniLmEmbedderOptions {
  /** Hugging Face model id, e.g. "Xenova/all-MiniLM-L6-v2". */
  model: string;
  /** Where downloaded model files are kept, so only the first start needs the internet. */
  cacheDir: string;
}

/**
 * Real embedder (`AI_PROVIDER=local`): a sentence-transformer running in-process
 * through ONNX Runtime (spec §4.3). Vectors are mean-pooled and L2-normalized,
 * so a dot product is the cosine similarity.
 *
 * Create it with `MiniLmEmbedder.load()`; the tokenizer must be loaded before
 * `countTokens` (which is synchronous) can be used.
 */
export class MiniLmEmbedder implements TextEmbedder {
  readonly dimensions = DIMENSIONS;

  /** One inference at a time, so concurrent uploads don't compete for the CPU. */
  private readonly queue = new PQueue({ concurrency: 1 });

  private constructor(
    readonly model: string,
    private readonly extractor: FeatureExtractionPipeline,
  ) {}

  static async load(options: MiniLmEmbedderOptions): Promise<MiniLmEmbedder> {
    const logger = new Logger(MiniLmEmbedder.name);
    env.cacheDir = resolve(options.cacheDir);
    logger.log(
      `Loading embedding model ${options.model} (the first start downloads it, about 23 MB)`,
    );
    const startedAt = performance.now();
    const extractor = await pipeline('feature-extraction', options.model, { dtype: 'q8' });
    logger.log(`Embedding model ready in ${Math.round(performance.now() - startedAt)} ms`);
    return new MiniLmEmbedder(options.model, extractor);
  }

  async embed(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const output = await this.queue.add(() =>
        this.extractor(batch, { pooling: 'mean', normalize: true }),
      );
      vectors.push(...toVectors(output.data, batch.length));
    }
    return vectors;
  }

  countTokens(text: string): number {
    return this.extractor.tokenizer.encode(text, { add_special_tokens: false }).length;
  }

  /** Frees the ONNX session (called on application shutdown). */
  dispose(): Promise<void> {
    return this.extractor.dispose();
  }
}
