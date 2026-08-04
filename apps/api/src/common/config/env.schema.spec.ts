import { envSchema } from './env.schema';

const validEnvironment = {
  DATABASE_URL: 'postgresql://regive:password@localhost:5432/regive',
  REDIS_URL: 'redis://localhost:6379',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_JWKS_URL:
    'https://project.supabase.co/auth/v1/.well-known/jwks.json',
  SUPABASE_ANON_KEY: 'anon-key-for-tests',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-for-tests',
  PII_ENCRYPTION_KEY_V1: 'encryption-key-for-tests',
};

describe('envSchema', () => {
  it('accepts all required runtime configuration', () => {
    expect(envSchema.parse(validEnvironment)).toEqual(validEnvironment);
  });

  it('names a missing required key', () => {
    const environment: Partial<typeof validEnvironment> = {
      ...validEnvironment,
    };
    delete environment.DATABASE_URL;

    expect(() => envSchema.parse(environment)).toThrow('DATABASE_URL');
  });

  it('names a malformed URL key', () => {
    expect(() =>
      envSchema.parse({ ...validEnvironment, SUPABASE_URL: 'not-a-url' }),
    ).toThrow('SUPABASE_URL');
  });

  it('rejects a whitespace-only secret', () => {
    expect(() =>
      envSchema.parse({
        ...validEnvironment,
        SUPABASE_SERVICE_ROLE_KEY: '   ',
      }),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });

  it.each([
    'DATABASE_URL',
    'REDIS_URL',
    'SUPABASE_URL',
    'SUPABASE_JWKS_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PII_ENCRYPTION_KEY_V1',
  ] as const)('rejects an empty %s value', (key) => {
    expect(() => envSchema.parse({ ...validEnvironment, [key]: '' })).toThrow(
      key,
    );
  });
});
