import { z } from 'zod';

const nonEmptyUrl = z.string().min(1).url();
const nonBlankString = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: 'Value must not be blank',
  });
const encryptionKey = nonBlankString.refine(
  (value) => {
    const decoded = Buffer.from(value, 'base64');
    return decoded.length === 32 && decoded.toString('base64') === value;
  },
  { message: 'PII_ENCRYPTION_KEY_V1 must be base64 for exactly 32 bytes' },
);

const urlWithProtocol = (...protocols: string[]) =>
  nonEmptyUrl.refine(
    (value) =>
      URL.canParse(value) && protocols.includes(new URL(value).protocol),
    {
      message: `URL must use ${protocols.join(' or ')}`,
    },
  );

const baseEnvSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ALLOW_INSECURE_SUPABASE_HTTP: z.enum(['true', 'false']).default('false'),
  DATABASE_URL: urlWithProtocol('postgres:', 'postgresql:'),
  // Not yet read anywhere in the app (reserved for future chat/notification
  // features) — optional so deployment doesn't require provisioning Redis
  // before anything actually needs it.
  REDIS_URL: urlWithProtocol('redis:', 'rediss:').optional(),
  SUPABASE_URL: urlWithProtocol('http:', 'https:'),
  SUPABASE_JWKS_URL: urlWithProtocol('http:', 'https:'),
  SUPABASE_ANON_KEY: nonBlankString,
  SUPABASE_SERVICE_ROLE_KEY: nonBlankString,
  PII_ENCRYPTION_KEY_V1: encryptionKey,
});

export const envSchema = baseEnvSchema.superRefine((environment, context) => {
  const production = environment.NODE_ENV === 'production';
  const insecureOptIn = environment.ALLOW_INSECURE_SUPABASE_HTTP === 'true';
  const insecureTransportAllowed = !production && insecureOptIn;

  if (production && insecureOptIn) {
    context.addIssue({
      code: 'custom',
      path: ['ALLOW_INSECURE_SUPABASE_HTTP'],
      message: 'ALLOW_INSECURE_SUPABASE_HTTP cannot be enabled in production',
    });
  }

  for (const key of ['SUPABASE_URL', 'SUPABASE_JWKS_URL'] as const) {
    if (
      URL.canParse(environment[key]) &&
      new URL(environment[key]).protocol === 'http:' &&
      !insecureTransportAllowed
    ) {
      context.addIssue({
        code: 'custom',
        path: [key],
        message: `${key} must use https unless explicitly enabled outside production`,
      });
    }
  }
});

export type Environment = z.infer<typeof envSchema>;
