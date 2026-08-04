import { z } from 'zod';

const nonEmptyUrl = z.string().min(1).url();
const nonBlankString = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: 'Value must not be blank',
  });

const urlWithProtocol = (...protocols: string[]) =>
  nonEmptyUrl.refine(
    (value) =>
      URL.canParse(value) && protocols.includes(new URL(value).protocol),
    {
      message: `URL must use ${protocols.join(' or ')}`,
    },
  );

export const envSchema = z.object({
  DATABASE_URL: urlWithProtocol('postgres:', 'postgresql:'),
  REDIS_URL: urlWithProtocol('redis:', 'rediss:'),
  SUPABASE_URL: urlWithProtocol('http:', 'https:'),
  SUPABASE_JWKS_URL: urlWithProtocol('http:', 'https:'),
  SUPABASE_ANON_KEY: nonBlankString,
  SUPABASE_SERVICE_ROLE_KEY: nonBlankString,
  PII_ENCRYPTION_KEY_V1: nonBlankString,
});

export type Environment = z.infer<typeof envSchema>;
