import { z } from 'zod';

const WEIGHT_SUM_TOLERANCE = 1e-6;

const DURATION_UNIT_SECONDS = new Map([
  ['s', 1],
  ['m', 60],
  ['h', 3600],
  ['d', 86_400],
]);

/** Parses durations such as "90s", "30m", "8h" or "7d" into seconds. */
const durationInSeconds = z
  .string()
  .regex(/^\d+[smhd]$/, 'must be a number followed by s, m, h or d (e.g. "8h")')
  .transform(
    (value) => Number(value.slice(0, -1)) * (DURATION_UNIT_SECONDS.get(value.slice(-1)) ?? 0),
  )
  .refine((seconds) => seconds > 0, 'must be greater than zero');

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

    MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://')
      .default('mongodb://localhost:27017/resume-matcher'),

    // Required, no default: a guessable signing secret would let anyone forge sessions.
    JWT_SECRET: z
      .string({ error: 'is required (at least 32 random characters)' })
      .min(32, 'must be at least 32 characters'),
    /** Session length. Accepts "8h" style input; the parsed value is in seconds. */
    JWT_EXPIRES_IN: durationInSeconds.default(8 * 3600),
    /** Login attempts allowed per IP per minute. */
    LOGIN_RATE_LIMIT: z.coerce.number().int().positive().default(5),

    // Only read by `npm run seed:admin`.
    ADMIN_NAME: z.string().trim().optional(),
    ADMIN_EMAIL: z.string().trim().optional(),
    ADMIN_PASSWORD: z.string().optional(),

    AI_PROVIDER: z.enum(['stub', 'local']).default('stub'),
    /** Hugging Face model used for embeddings when `AI_PROVIDER=local`. */
    EMBEDDING_MODEL: z.string().min(1).default('Xenova/all-MiniLM-L6-v2'),
    /** Downloaded model files (relative paths resolve against the working directory). */
    MODEL_CACHE_DIR: z.string().min(1).default('.cache/models'),
    /** Artificial delay of the stand-in LLM tasks, so "in progress" states are visible in the UI. */
    AI_STUB_DELAY_MS: z.coerce.number().int().min(0).default(2000),

    OLLAMA_URL: z.url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().min(1).default('llama3.2:3b'),
    OLLAMA_NUM_CTX: z.coerce.number().int().positive().default(8192),
    OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(600_000),

    SIM_FLOOR: z.coerce.number().min(-1).max(1).default(0.25),
    SIM_CEILING: z.coerce.number().min(-1).max(1).default(0.8),
    SKILL_MATCH_THRESHOLD: z.coerce.number().min(0).max(1).default(0.55),
    SCORE_WEIGHT_SEMANTIC: z.coerce.number().min(0).max(1).default(0.6),
    SCORE_WEIGHT_COVERAGE: z.coerce.number().min(0).max(1).default(0.4),

    CORS_ORIGIN: z.url().default('http://localhost:5173'),
  })
  .refine((env) => env.SIM_FLOOR < env.SIM_CEILING, {
    message: 'SIM_FLOOR must be lower than SIM_CEILING',
    path: ['SIM_FLOOR'],
  })
  .refine(
    (env) =>
      Math.abs(env.SCORE_WEIGHT_SEMANTIC + env.SCORE_WEIGHT_COVERAGE - 1) < WEIGHT_SUM_TOLERANCE,
    {
      message: 'SCORE_WEIGHT_SEMANTIC and SCORE_WEIGHT_COVERAGE must add up to 1',
      path: ['SCORE_WEIGHT_SEMANTIC'],
    },
  );

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at startup so misconfiguration fails fast
 * instead of surfacing later as a runtime error. Used by `ConfigModule.forRoot`.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
