import type { IdentityClaims } from '@buy-nothing/contracts';

export abstract class IdentityVerifier {
  abstract verify(token: string): Promise<IdentityClaims>;
}
