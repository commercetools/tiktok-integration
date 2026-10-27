import { randomBytes } from 'node:crypto';
import { decrypt, encrypt, parseEncryptionKey } from '../crypto';
import { CryptoError } from '../errors';

const key = randomBytes(32);

describe('crypto', () => {
  it('round-trips and uses the v1 format', () => {
    const encrypted = encrypt('secret-token', key);
    expect(encrypted.split(':')).toHaveLength(4);
    expect(encrypted.startsWith('v1:')).toBe(true);
    expect(encrypted).not.toContain('secret-token');
    expect(decrypt(encrypted, key)).toBe('secret-token');
  });

  it('uses a fresh IV per encryption', () => {
    expect(encrypt('same', key)).not.toBe(encrypt('same', key));
  });

  it('rejects a wrong key', () => {
    expect(() => decrypt(encrypt('x', key), randomBytes(32))).toThrow(CryptoError);
  });

  it('rejects a tampered ciphertext or tag', () => {
    const [version, iv, tag, ciphertext] = encrypt('payload', key).split(':') as [string, string, string, string];
    const flip = (value: string) => {
      const bytes = Buffer.from(value, 'base64');
      bytes[0] = (bytes[0] ?? 0) ^ 1;
      return bytes.toString('base64');
    };
    expect(() => decrypt([version, iv, tag, flip(ciphertext)].join(':'), key)).toThrow(CryptoError);
    expect(() => decrypt([version, iv, flip(tag), ciphertext].join(':'), key)).toThrow(CryptoError);
  });

  it('rejects malformed values and unknown versions', () => {
    expect(() => decrypt('garbage', key)).toThrow(CryptoError);
    expect(() => decrypt(encrypt('x', key).replace('v1:', 'v2:'), key)).toThrow(CryptoError);
  });

  it('requires a 32-byte key', () => {
    expect(() => encrypt('x', randomBytes(16))).toThrow(CryptoError);
    expect(() => parseEncryptionKey(randomBytes(16).toString('base64'))).toThrow(CryptoError);
    expect(parseEncryptionKey(key.toString('base64'))).toEqual(key);
  });
});
