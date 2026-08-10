import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requireSupabaseAnonKey, requireSupabaseUrl } from './env';

/**
 * Server-side Supabase client for Server Components, Server Actions and
 * Route Handlers. Reads/writes the session through Next.js's cookies() API
 * so the session is shared with the browser via HttpOnly cookies rather
 * than localStorage.
 *
 * Must be awaited: `const supabase = await createClient();`
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(requireSupabaseUrl(), requireSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll was called from a Server Component render, where
          // cookies() is read-only. This is safe to ignore because
          // proxy.ts refreshes the session cookie on the next request.
        }
      },
    },
  });
}
