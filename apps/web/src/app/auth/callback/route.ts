import { NextResponse, type NextRequest } from 'next/server';
import { completeSignInRedirect } from '@/features/auth/auth-actions';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth redirect target for both Google and Facebook (configured as the
 * `redirectTo` in features/auth/auth-actions.ts's signInWithOAuth calls).
 * Exchanges the authorization code for a Supabase session, then hands off
 * to completeSignInRedirect for onboarding routing.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorDescription = searchParams.get('error_description');

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  await completeSignInRedirect();
}
