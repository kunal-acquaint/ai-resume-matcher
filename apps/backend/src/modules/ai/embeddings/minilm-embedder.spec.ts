import { resolve } from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
import { MiniLmEmbedder } from './minilm-embedder.js';

vi.mock('@huggingface/transformers', () => ({ env: { cacheDir: null }, pipeline: vi.fn() }));

/** Stands in for the ONNX pipeline: a flat [texts, 384] tensor whose n-th row is filled with n. */
function fakeExtractor() {
  const extractor = Object.assign(
    vi.fn((texts: string[]) =>
      Promise.resolve({
        data: Float32Array.from({ length: texts.length * 384 }, (_, i) => Math.floor(i / 384)),
      }),
    ),
    {
      tokenizer: { encode: vi.fn((text: string) => text.split(' ').map(() => 1)) },
      dispose: vi.fn(() => Promise.resolve()),
    },
  );
  vi.mocked(pipeline).mockResolvedValue(extractor as never);
  return extractor;
}

describe('MiniLmEmbedder', () => {
  beforeEach(() => {
    vi.mocked(pipeline).mockReset();
  });

  it('loads the quantized model into the configured cache directory', async () => {
    fakeExtractor();

    const embedder = await MiniLmEmbedder.load({ model: 'Xenova/test-model', cacheDir: 'models' });

    expect(pipeline).toHaveBeenCalledWith('feature-extraction', 'Xenova/test-model', {
      dtype: 'q8',
    });
    expect(env.cacheDir).toBe(resolve('models'));
    expect(embedder.model).toBe('Xenova/test-model');
    expect(embedder.dimensions).toBe(384);
  });

  it('requests mean-pooled, normalized vectors in batches and keeps input order', async () => {
    const extractor = fakeExtractor();
    const embedder = await MiniLmEmbedder.load({ model: 'm', cacheDir: 'models' });
    const texts = Array.from({ length: 20 }, (_, i) => `text ${i}`);

    const vectors = await embedder.embed(texts);

    expect(extractor).toHaveBeenCalledTimes(2);
    expect(extractor).toHaveBeenNthCalledWith(1, texts.slice(0, 16), {
      pooling: 'mean',
      normalize: true,
    });
    expect(extractor).toHaveBeenNthCalledWith(2, texts.slice(16), {
      pooling: 'mean',
      normalize: true,
    });
    expect(vectors).toHaveLength(20);
    expect(vectors[1]).toHaveLength(384);
    expect(vectors[1][0]).toBe(1);
    expect(vectors[17][383]).toBe(1); // second row of the second batch
  });

  it('rejects output that does not match the inputs', async () => {
    const extractor = fakeExtractor();
    extractor.mockResolvedValueOnce({ data: new Float32Array(10) });
    const embedder = await MiniLmEmbedder.load({ model: 'm', cacheDir: 'models' });

    await expect(embedder.embed(['a'])).rejects.toThrow('Unexpected embedding output');
  });

  it('counts tokens with the model tokenizer, without special tokens', async () => {
    const extractor = fakeExtractor();
    const embedder = await MiniLmEmbedder.load({ model: 'm', cacheDir: 'models' });

    expect(embedder.countTokens('three word text')).toBe(3);
    expect(extractor.tokenizer.encode).toHaveBeenCalledWith('three word text', {
      add_special_tokens: false,
    });
  });

  it('frees the model on dispose', async () => {
    const extractor = fakeExtractor();
    const embedder = await MiniLmEmbedder.load({ model: 'm', cacheDir: 'models' });

    await embedder.dispose();

    expect(extractor.dispose).toHaveBeenCalled();
  });
});
