import { validateEnv } from './env.schema.js';

const JWT_SECRET = 'a'.repeat(32);
const withSecret = (env: Record<string, string> = {}) => ({ JWT_SECRET, ...env });

describe('validateEnv', () => {
  it('applies defaults when optional variables are not set', () => {
    const env = validateEnv(withSecret());

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      MONGODB_URI: 'mongodb://localhost:27017/resume-matcher',
      JWT_EXPIRES_IN: 8 * 3600,
      LOGIN_RATE_LIMIT: 5,
      AI_PROVIDER: 'stub',
      OLLAMA_MODEL: 'llama3.2:3b',
      OLLAMA_TIMEOUT_MS: 600_000,
      SIM_FLOOR: 0.25,
      SIM_CEILING: 0.8,
      SKILL_MATCH_THRESHOLD: 0.55,
    });
  });

  it('coerces numeric strings from process.env', () => {
    const env = validateEnv(withSecret({ PORT: '4000', OLLAMA_NUM_CTX: '4096' }));

    expect(env.PORT).toBe(4000);
    expect(env.OLLAMA_NUM_CTX).toBe(4096);
  });

  it('accepts mongodb+srv connection strings', () => {
    const uri = 'mongodb+srv://user:pass@cluster0.example.net/resume-matcher';

    expect(validateEnv(withSecret({ MONGODB_URI: uri })).MONGODB_URI).toBe(uri);
  });

  describe('JWT settings', () => {
    it('requires JWT_SECRET', () => {
      expect(() => validateEnv({})).toThrow('JWT_SECRET');
    });

    it('rejects a JWT_SECRET shorter than 32 characters', () => {
      expect(() => validateEnv({ JWT_SECRET: 'too-short' })).toThrow('at least 32 characters');
    });

    it.each([
      ['90s', 90],
      ['30m', 1800],
      ['8h', 28_800],
      ['7d', 604_800],
    ])('parses JWT_EXPIRES_IN=%s into %i seconds', (input, seconds) => {
      expect(validateEnv(withSecret({ JWT_EXPIRES_IN: input })).JWT_EXPIRES_IN).toBe(seconds);
    });

    it.each(['8', '8 hours', '0h', '-1h'])('rejects JWT_EXPIRES_IN=%s', (input) => {
      expect(() => validateEnv(withSecret({ JWT_EXPIRES_IN: input }))).toThrow('JWT_EXPIRES_IN');
    });
  });

  it.each([
    [{ PORT: 'abc' }, 'PORT'],
    [{ MONGODB_URI: 'postgres://localhost/db' }, 'MONGODB_URI'],
    [{ OLLAMA_URL: 'not-a-url' }, 'OLLAMA_URL'],
    [{ NODE_ENV: 'staging' }, 'NODE_ENV'],
    [{ AI_PROVIDER: 'openai' }, 'AI_PROVIDER'],
    [{ LOGIN_RATE_LIMIT: '0' }, 'LOGIN_RATE_LIMIT'],
  ])('rejects invalid value %o', (input, variable) => {
    expect(() => validateEnv(withSecret(input))).toThrow(variable);
  });

  it('rejects SIM_FLOOR that is not lower than SIM_CEILING', () => {
    expect(() => validateEnv(withSecret({ SIM_FLOOR: '0.8', SIM_CEILING: '0.7' }))).toThrow(
      'SIM_FLOOR must be lower than SIM_CEILING',
    );
  });

  it('rejects score weights that do not add up to 1', () => {
    expect(() =>
      validateEnv(withSecret({ SCORE_WEIGHT_SEMANTIC: '0.5', SCORE_WEIGHT_COVERAGE: '0.4' })),
    ).toThrow('must add up to 1');
  });
});
