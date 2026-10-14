import { Inject, Injectable } from '@nestjs/common';
import { chunkText } from './chunk-text.js';
import { TEXT_EMBEDDER, type TextEmbedder } from './text-embedder.js';
import { meanVector } from './vector-math.js';

/** ~200 tokens separated candidates best in the AI test run (spec §5.2). */
export const MAX_CHUNK_TOKENS = 200;

export interface EmbeddedChunk {
  text: string;
  embedding: number[];
}

/** Chunks and embeds documents; identical logic for every `TextEmbedder`. */
@Injectable()
export class DocumentEmbedder {
  constructor(@Inject(TEXT_EMBEDDER) private readonly embedder: TextEmbedder) {}

  get model(): string {
    return this.embedder.model;
  }

  async embedChunks(text: string): Promise<EmbeddedChunk[]> {
    const chunks = chunkText(text, (t) => this.embedder.countTokens(t), MAX_CHUNK_TOKENS);
    if (chunks.length === 0) {
      return [];
    }
    const embeddings = await this.embedder.embed(chunks);
    return chunks.map((chunk, i) => ({ text: chunk, embedding: embeddings[i] }));
  }

  /** One vector for a whole document: the normalized mean of its chunk vectors. */
  async embedDocument(text: string): Promise<number[]> {
    const chunks = await this.embedChunks(text);
    if (chunks.length === 0) {
      throw new Error('Cannot embed an empty document');
    }
    return meanVector(chunks.map((chunk) => chunk.embedding));
  }

  embedTexts(texts: string[]): Promise<number[][]> {
    return texts.length === 0 ? Promise.resolve([]) : this.embedder.embed(texts);
  }
}
