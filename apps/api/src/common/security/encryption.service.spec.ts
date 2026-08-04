import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

const TEST_KEY = Buffer.alloc(32, 7).toString('base64');
const configWithKey = (key: string): ConfigService =>
  ({ getOrThrow: () => key }) as unknown as ConfigService;

describe('EncryptionService', () => {
  it('round trips encrypted personal data', () => {
    const service = new EncryptionService(configWithKey(TEST_KEY));
    const encrypted = service.encrypt('+84912345678');

    expect(service.decrypt(encrypted)).toBe('+84912345678');
  });

  it('uses a fresh IV so repeated plaintext has different ciphertext', () => {
    const service = new EncryptionService(configWithKey(TEST_KEY));

    expect(service.encrypt('+84912345678')).not.toBe(
      service.encrypt('+84912345678'),
    );
  });

  it('rejects a tampered stored value', () => {
    const service = new EncryptionService(configWithKey(TEST_KEY));
    const encrypted = service.encrypt('+84912345678');
    const parts = encrypted.split('.');
    parts[2] = `${parts[2]?.slice(0, -1)}${parts[2]?.endsWith('A') ? 'B' : 'A'}`;

    expect(() => service.decrypt(parts.join('.'))).toThrow();
  });

  it('does not embed plaintext in the versioned stored value', () => {
    const service = new EncryptionService(configWithKey(TEST_KEY));

    expect(service.encrypt('+84912345678')).not.toContain('+84912345678');
  });

  it('names PII_ENCRYPTION_KEY_V1 when the decoded key is not 32 bytes', () => {
    expect(
      () =>
        new EncryptionService(
          configWithKey(Buffer.alloc(31, 7).toString('base64')),
        ),
    ).toThrow('PII_ENCRYPTION_KEY_V1');
  });
});
