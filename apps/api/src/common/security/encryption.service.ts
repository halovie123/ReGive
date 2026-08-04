import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;
const KEY_VERSION = 'v1';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(
      config.getOrThrow<string>('PII_ENCRYPTION_KEY_V1'),
      'base64',
    );

    if (this.key.length !== KEY_BYTES) {
      throw new Error('PII_ENCRYPTION_KEY_V1 must decode to exactly 32 bytes');
    }
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      KEY_VERSION,
      iv.toString('base64url'),
      ciphertext.toString('base64url'),
      tag.toString('base64url'),
    ].join('.');
  }

  decrypt(storedValue: string): string {
    const [version, ivValue, ciphertextValue, tagValue, extra] =
      storedValue.split('.');
    if (
      version !== KEY_VERSION ||
      !ivValue ||
      !ciphertextValue ||
      !tagValue ||
      extra
    ) {
      throw new Error('Encrypted value has an invalid format');
    }

    const iv = Buffer.from(ivValue, 'base64url');
    const ciphertext = Buffer.from(ciphertextValue, 'base64url');
    const tag = Buffer.from(tagValue, 'base64url');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }
}
