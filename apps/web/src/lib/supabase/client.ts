'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseAnonKey, requireSupabaseUrl } from './env';

/**
 * Browser-side Supabase client for Client Components. Session tokens are
 * persisted via cookies (through @supabase/ssr), not localStorage, so the
 * server (Server Components, Server Actions, proxy.ts) always sees the same
 * session as the browser.
 */
export function createClient() {
  return createBrowserClient(requireSupabaseUrl(), requireSupabaseAnonKey());
}
