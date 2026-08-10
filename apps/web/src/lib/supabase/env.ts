/**
 * Public Supabase project configuration. These are read at build time by
 * Next.js (NEXT_PUBLIC_* variables are inlined into the client bundle) and
 * at request time on the server. See apps/web/.env.example.
 */
export function supabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL;
}

export function supabaseAnonKey(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function requireSupabaseUrl(): string {
  const value = supabaseUrl();
  if (!value) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  return value;
}

export function requireSupabaseAnonKey(): string {
  const value = supabaseAnonKey();
  if (!value) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return value;
}
