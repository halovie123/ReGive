import { ConfigService } from '@nestjs/config';
import {
  JwtCryptographicVerifier,
  type JwtVerificationOptions,
  SupabaseIdentityVerifier,
} from './supabase-identity.verifier';

const configuration = {
  SUPABASE_URL: 'https://trusted-project.supabase.co',
  SUPABASE_JWKS_URL:
    'https://trusted-project.supabase.co/auth/v1/.well-known/jwks.json',
};

const config = {
  getOrThrow: (key: keyof typeof configuration) => configuration[key],
} as unknown as ConfigService;

class CapturingVerifier implements JwtCryptographicVerifier {
  options?: JwtVerificationOptions;

  constructor(private readonly payload: Record<string, unknown>) {}

  verify(
    _token: string,
    options: JwtVerificationOptions,
  ): Promise<Record<string, unknown>> {
    this.options = options;
    return Promise.resolve(this.payload);
  }
}

describe('SupabaseIdentityVerifier', () => {
  it('verifies with fixed trusted issuer, audience, JWKS and algorithms', async () => {
    const cryptographicVerifier = new CapturingVerifier({
      sub: 'subject-1',
      session_id: 'session-1',
      iss: 'attacker-controlled-claim',
      aud: 'attacker-controlled-claim',
    });
    const verifier = new SupabaseIdentityVerifier(
      config,
      cryptographicVerifier,
    );

    await expect(verifier.verify('opaque-token')).resolves.toEqual({
      subject: 'subject-1',
      sessionId: 'session-1',
    });
    expect(cryptographicVerifier.options).toEqual({
      jwksUrl:
        'https://trusted-project.supabase.co/auth/v1/.well-known/jwks.json',
      issuer: 'https://trusted-project.supabase.co/auth/v1',
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
    });
  });

  it.each([
    { sub: '', session_id: 'session-1' },
    { sub: 'subject-1', session_id: '' },
    { sub: 'subject-1' },
  ])('rejects missing or blank trusted identity claims', async (payload) => {
    const verifier = new SupabaseIdentityVerifier(
      config,
      new CapturingVerifier(payload),
    );

    await expect(verifier.verify('opaque-token')).rejects.toThrow(
      'Identity token is invalid',
    );
  });

  it('does not expose cryptographic verification details', async () => {
    const cryptographicVerifier: JwtCryptographicVerifier = {
      verify: () =>
        Promise.reject(new Error('raw JWKS upstream response must-not-leak')),
    };
    const verifier = new SupabaseIdentityVerifier(
      config,
      cryptographicVerifier,
    );

    await expect(verifier.verify('opaque-token')).rejects.toThrow(
      'Identity token is invalid',
    );
    await expect(verifier.verify('opaque-token')).rejects.not.toThrow(
      'must-not-leak',
    );
  });
});
