import type { IdentityClaims } from '@buy-nothing/contracts';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { createRemoteJWKSet, JWTPayload } from 'jose';
import { IdentityVerifier } from './identity-verifier';

export type JwtVerificationOptions = {
  jwksUrl: string;
  issuer: string;
  audience: string;
  algorithms: readonly ['ES256', 'RS256'];
};

export abstract class JwtCryptographicVerifier {
  abstract verify(
    token: string,
    options: JwtVerificationOptions,
  ): Promise<Record<string, unknown>>;
}

type RemoteKeySet = ReturnType<typeof createRemoteJWKSet>;

@Injectable()
export class JoseRemoteJwtVerifier implements JwtCryptographicVerifier {
  private readonly keySets = new Map<string, Promise<RemoteKeySet>>();

  async verify(
    token: string,
    options: JwtVerificationOptions,
  ): Promise<JWTPayload> {
    const jose = await import('jose');
    let keySet = this.keySets.get(options.jwksUrl);
    if (!keySet) {
      keySet = Promise.resolve(
        jose.createRemoteJWKSet(new URL(options.jwksUrl), {
          cacheMaxAge: 600_000,
          cooldownDuration: 30_000,
          timeoutDuration: 5_000,
        }),
      );
      this.keySets.set(options.jwksUrl, keySet);
    }

    const result = await jose.jwtVerify(token, await keySet, {
      issuer: options.issuer,
      audience: options.audience,
      algorithms: [...options.algorithms],
    });
    return result.payload;
  }
}

@Injectable()
export class SupabaseIdentityVerifier implements IdentityVerifier {
  private readonly options: JwtVerificationOptions;

  constructor(
    config: ConfigService,
    private readonly cryptographicVerifier: JwtCryptographicVerifier,
  ) {
    const supabaseUrl = config
      .getOrThrow<string>('SUPABASE_URL')
      .replace(/\/$/, '');
    this.options = {
      jwksUrl: config.getOrThrow<string>('SUPABASE_JWKS_URL'),
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated',
      algorithms: ['ES256', 'RS256'],
    };
  }

  async verify(token: string): Promise<IdentityClaims> {
    try {
      const payload = await this.cryptographicVerifier.verify(
        token,
        this.options,
      );
      const subject = payload.sub;
      const sessionId = payload.session_id;
      if (
        typeof subject !== 'string' ||
        !subject.trim() ||
        typeof sessionId !== 'string' ||
        !sessionId.trim()
      ) {
        throw new Error('Required identity claim is absent');
      }

      return { subject, sessionId };
    } catch {
      throw new Error('Identity token is invalid');
    }
  }
}
