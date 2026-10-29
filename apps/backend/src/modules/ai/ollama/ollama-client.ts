import { z } from 'zod';

export interface OllamaClientOptions {
  /** Base URL of the Ollama server, e.g. "http://localhost:11434". */
  url: string;
  /** Upper limit for one request, including model loading and generation. */
  timeoutMs: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  /** JSON schema the answer must follow (Ollama structured output). */
  format?: Record<string, unknown>;
  options?: { temperature?: number; num_ctx?: number; num_predict?: number };
}

export interface ChatResult {
  content: string;
  /** "stop" when the model finished, "length" when it hit `num_predict`. */
  doneReason: string | undefined;
  promptTokens: number | undefined;
  outputTokens: number | undefined;
}

/** One line of the streamed /api/chat response (only the fields we use). */
const chatChunkSchema = z.object({
  message: z.object({ content: z.string() }).optional(),
  done: z.boolean().optional(),
  done_reason: z.string().optional(),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
  error: z.string().optional(),
});

const tagsSchema = z.object({ models: z.array(z.object({ name: z.string() })) });

/** Raised for every Ollama failure, with a message an admin can act on. */
export class OllamaError extends Error {
  override readonly name = 'OllamaError';
}

/**
 * Minimal client for the local Ollama HTTP API (spec §4.3). Chat responses are
 * streamed: the connection carries data while the model generates, so slow CPUs
 * don't hit HTTP idle timeouts, and the whole request is bounded by `timeoutMs`.
 */
export class OllamaClient {
  constructor(private readonly options: OllamaClientOptions) {}

  async chat(request: ChatRequest): Promise<ChatResult> {
    const response = await this.post('/api/chat', { ...request, stream: true });
    if (!response.body) {
      throw new OllamaError('Ollama returned an empty response');
    }

    const result: ChatResult = {
      content: '',
      doneReason: undefined,
      promptTokens: undefined,
      outputTokens: undefined,
    };
    try {
      for await (const line of readLines(response.body)) {
        const chunk = parseChunk(line);
        if (chunk.error) {
          throw new OllamaError(`Ollama error: ${chunk.error}`);
        }
        result.content += chunk.message?.content ?? '';
        if (chunk.done) {
          result.doneReason = chunk.done_reason;
          result.promptTokens = chunk.prompt_eval_count;
          result.outputTokens = chunk.eval_count;
        }
      }
    } catch (error) {
      throw toOllamaError(error, this.options.timeoutMs);
    }
    return result;
  }

  /** Names of the locally pulled models, e.g. ["llama3.2:3b"]. */
  async listModels(timeoutMs = 5000): Promise<string[]> {
    let response: Response;
    try {
      response = await fetch(new URL('/api/tags', this.options.url), {
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw toOllamaError(error, timeoutMs, this.options.url);
    }
    if (!response.ok) {
      throw new OllamaError(`Ollama returned HTTP ${response.status}`);
    }
    return tagsSchema.parse(await response.json()).models.map((model) => model.name);
  }

  private async post(path: string, body: unknown): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.options.url), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.options.timeoutMs),
      });
    } catch (error) {
      throw toOllamaError(error, this.options.timeoutMs, this.options.url);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new OllamaError(`Ollama returned HTTP ${response.status}: ${detail.slice(0, 300)}`);
    }
    return response;
  }
}

function parseChunk(line: string): z.infer<typeof chatChunkSchema> {
  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch {
    throw new OllamaError('Ollama sent a malformed stream line');
  }
  return chatChunkSchema.parse(json);
}

/** Splits a byte stream into non-empty text lines (Ollama streams NDJSON). */
async function* readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const bytes of body) {
    buffer += decoder.decode(bytes, { stream: true });
    let newline = buffer.indexOf('\n');
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield line;
      newline = buffer.indexOf('\n');
    }
  }
  const rest = (buffer + decoder.decode()).trim();
  if (rest) yield rest;
}

function toOllamaError(error: unknown, timeoutMs: number, url?: string): OllamaError {
  if (error instanceof OllamaError) {
    return error;
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return new OllamaError(`Ollama did not finish within ${Math.round(timeoutMs / 1000)} s`);
  }
  const reason = error instanceof Error ? error.message : String(error);
  return new OllamaError(
    url
      ? `Cannot reach Ollama at ${url} (${reason}). Is Ollama running?`
      : `Ollama request failed: ${reason}`,
  );
}
