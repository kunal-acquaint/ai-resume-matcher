import { validateEnv } from './env.schema.js';

describe('validateEnv', () => {
  it('applies defaults when variables are not set', () => {
    const env = validateEnv({});

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      MONGODB_URI: 'mongodb://localhost:27017/resume-matcher',
      OLLAMA_MODEL: 'llama3.2:3b',
      SIM_FLOOR: 0.15,
      SIM_CEILING: 0.7,
    });
  });

  it('coerces numeric strings from process.env', () => {
    const env = validateEnv({ PORT: '4000', OLLAMA_NUM_CTX: '4096' });

    expect(env.PORT).toBe(4000);
    expect(env.OLLAMA_NUM_CTX).toBe(4096);
  });

  it('accepts mongodb+srv connection strings', () => {
    const uri = 'mongodb+srv://user:pass@cluster0.example.net/resume-matcher';

    expect(validateEnv({ MONGODB_URI: uri }).MONGODB_URI).toBe(uri);
  });

  it.each([
    [{ PORT: 'abc' }, 'PORT'],
    [{ MONGODB_URI: 'postgres://localhost/db' }, 'MONGODB_URI'],
    [{ OLLAMA_URL: 'not-a-url' }, 'OLLAMA_URL'],
    [{ NODE_ENV: 'staging' }, 'NODE_ENV'],
  ])('rejects invalid value %o', (input, variable) => {
    expect(() => validateEnv(input)).toThrow(variable);
  });

  it('rejects SIM_FLOOR that is not lower than SIM_CEILING', () => {
    expect(() => validateEnv({ SIM_FLOOR: '0.8', SIM_CEILING: '0.7' })).toThrow(
      'SIM_FLOOR must be lower than SIM_CEILING',
    );
  });

  it('rejects score weights that do not add up to 1', () => {
    expect(() =>
      validateEnv({ SCORE_WEIGHT_SEMANTIC: '0.5', SCORE_WEIGHT_COVERAGE: '0.4' }),
    ).toThrow('must add up to 1');
  });
});
