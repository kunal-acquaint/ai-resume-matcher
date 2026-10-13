import { z } from 'zod';

const WEIGHT_SUM_TOLERANCE = 1e-6;

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

    MONGODB_URI: z
      .string()
      .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://')
      .default('mongodb://localhost:27017/resume-matcher'),

    OLLAMA_URL: z.url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().min(1).default('llama3.2:3b'),
    OLLAMA_NUM_CTX: z.coerce.number().int().positive().default(8192),
    OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),

    SIM_FLOOR: z.coerce.number().min(-1).max(1).default(0.15),
    SIM_CEILING: z.coerce.number().min(-1).max(1).default(0.7),
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
