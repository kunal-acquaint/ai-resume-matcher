import { OllamaClient, OllamaError } from './ollama-client.js';

const fetchMock = vi.fn<typeof fetch>();

/** A streamed response whose body arrives in the given pieces (lines may be split). */
function streamed(pieces: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
  return new Response(body, { status });
}

const line = (value: object) => `${JSON.stringify(value)}\n`;

describe('OllamaClient', () => {
  const client = new OllamaClient({ url: 'http://ollama.test:11434', timeoutMs: 60_000 });

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('chat', () => {
    it('streams the request and joins the content, even when lines are split', async () => {
      const done = line({ done: true, done_reason: 'stop', prompt_eval_count: 12, eval_count: 3 });
      fetchMock.mockResolvedValue(
        streamed([
          line({ message: { content: '{"skills":' } }),
          line({ message: { content: '["React"]' } }).slice(0, 10),
          line({ message: { content: '["React"]' } }).slice(10),
          done + line({ message: { content: '}' } }).trimEnd(), // last line without newline
        ]),
      );

      const result = await client.chat({ model: 'llama3.2:3b', messages: [] });

      expect(result).toEqual({
        content: '{"skills":["React"]}',
        doneReason: 'stop',
        promptTokens: 12,
        outputTokens: 3,
      });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toEqual(new URL('http://ollama.test:11434/api/chat'));
      expect(typeof init?.body === 'string' && JSON.parse(init.body)).toEqual({
        model: 'llama3.2:3b',
        messages: [],
        stream: true,
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    });

    it('reports an unreachable server with a hint', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await expect(client.chat({ model: 'm', messages: [] })).rejects.toThrow(
        'Cannot reach Ollama at http://ollama.test:11434 (fetch failed). Is Ollama running?',
      );
    });

    it('reports HTTP errors with the response text', async () => {
      fetchMock.mockResolvedValue(new Response('model "m" not found', { status: 404 }));

      await expect(client.chat({ model: 'm', messages: [] })).rejects.toThrow(
        'Ollama returned HTTP 404: model "m" not found',
      );
    });

    it('reports errors sent inside the stream', async () => {
      fetchMock.mockResolvedValue(streamed([line({ error: 'out of memory' })]));

      await expect(client.chat({ model: 'm', messages: [] })).rejects.toThrow(
        'Ollama error: out of memory',
      );
    });

    it('reports a timeout in seconds', async () => {
      fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));

      await expect(client.chat({ model: 'm', messages: [] })).rejects.toThrow(
        'Ollama did not finish within 60 s',
      );
    });

    it('rejects malformed stream lines', async () => {
      fetchMock.mockResolvedValue(streamed(['not json\n']));

      await expect(client.chat({ model: 'm', messages: [] })).rejects.toBeInstanceOf(OllamaError);
    });
  });

  describe('listModels', () => {
    it('returns the names of the pulled models', async () => {
      fetchMock.mockResolvedValue(
        Response.json({ models: [{ name: 'llama3.2:3b', size: 1 }, { name: 'qwen3:4b' }] }),
      );

      await expect(client.listModels()).resolves.toEqual(['llama3.2:3b', 'qwen3:4b']);
      expect(fetchMock.mock.calls[0][0]).toEqual(new URL('http://ollama.test:11434/api/tags'));
    });

    it('reports an unreachable server', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));

      await expect(client.listModels()).rejects.toThrow('Is Ollama running?');
    });
  });
});
