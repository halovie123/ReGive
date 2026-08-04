import { envSchema } from './env.schema';

const validEnvironment = {
  NODE_ENV: 'test',
  ALLOW_INSECURE_SUPABASE_HTTP: 'false',
  DATABASE_URL: 'postgresql://regive:password@localhost:5432/regive',
  REDIS_URL: 'redis://localhost:6379',
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_JWKS_URL:
    'https://project.supabase.co/auth/v1/.well-known/jwks.json',
  SUPABASE_ANON_KEY: 'anon-key-for-tests',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-for-tests',
  PII_ENCRYPTION_KEY_V1: Buffer.alloc(32, 5).toString('base64'),
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

  it.each(['SUPABASE_URL', 'SUPABASE_JWKS_URL'] as const)(
    'rejects insecure production %s even when non-production opt-in is set',
    (key) => {
      expect(() =>
        envSchema.parse({
          ...validEnvironment,
          NODE_ENV: 'production',
          ALLOW_INSECURE_SUPABASE_HTTP: 'true',
          [key]:
            key === 'SUPABASE_URL'
              ? 'http://project.supabase.local'
              : 'http://project.supabase.local/auth/v1/.well-known/jwks.json',
        }),
      ).toThrow(key);
    },
  );

  it('rejects insecure non-production Supabase transport by default', () => {
    const environment = { ...validEnvironment };
    delete (environment as Partial<typeof validEnvironment>)
      .ALLOW_INSECURE_SUPABASE_HTTP;

    expect(() =>
      envSchema.parse({
        ...environment,
        SUPABASE_URL: 'http://project.supabase.local',
      }),
    ).toThrow('SUPABASE_URL');
  });

  it('allows explicit insecure Supabase transport only outside production', () => {
    expect(
      envSchema.parse({
        ...validEnvironment,
        ALLOW_INSECURE_SUPABASE_HTTP: 'true',
        SUPABASE_URL: 'http://project.supabase.local',
        SUPABASE_JWKS_URL:
          'http://project.supabase.local/auth/v1/.well-known/jwks.json',
      }),
    ).toMatchObject({
      ALLOW_INSECURE_SUPABASE_HTTP: 'true',
      SUPABASE_URL: 'http://project.supabase.local',
      SUPABASE_JWKS_URL:
        'http://project.supabase.local/auth/v1/.well-known/jwks.json',
    });
  });

  it('strictly validates the insecure transport opt-in', () => {
    expect(() =>
      envSchema.parse({
        ...validEnvironment,
        ALLOW_INSECURE_SUPABASE_HTTP: 'TRUE',
      }),
    ).toThrow('ALLOW_INSECURE_SUPABASE_HTTP');
  });

  it('rejects enabling the insecure transport opt-in in production', () => {
    expect(() =>
      envSchema.parse({
        ...validEnvironment,
        NODE_ENV: 'production',
        ALLOW_INSECURE_SUPABASE_HTTP: 'true',
      }),
    ).toThrow('ALLOW_INSECURE_SUPABASE_HTTP');
  });

  it('rejects a whitespace-only secret', () => {
    expect(() =>
      envSchema.parse({
        ...validEnvironment,
        SUPABASE_SERVICE_ROLE_KEY: '   ',
      }),
    ).toThrow('SUPABASE_SERVICE_ROLE_KEY');
  });

  it('names an encryption key that does not decode to 32 bytes', () => {
    expect(() =>
      envSchema.parse({
        ...validEnvironment,
        PII_ENCRYPTION_KEY_V1: Buffer.alloc(31, 5).toString('base64'),
      }),
    ).toThrow('PII_ENCRYPTION_KEY_V1');
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
