import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { CryptoError } from './errors';

const VERSION = 'v1';
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Decodes a base64 ENCRYPTION_KEY and requires exactly 32 bytes. */
export const parseEncryptionKey = (base64: string): Buffer => {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new CryptoError('The encryption key must be 32 bytes, base64-encoded');
  }
  return key;
};

/** AES-256-GCM; the result is `v1:<iv>:<tag>:<ciphertext>`, each part base64. */
export const encrypt = (plaintext: string, key: Buffer): string => {
  if (key.length !== KEY_BYTES) {
    throw new CryptoError('The encryption key must be 32 bytes');
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv, {
    authTagLength: TAG_BYTES,
  });
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return [
    VERSION,
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
};

/** Throws `CryptoError` for a malformed value, an unknown version, a wrong key or tampering. */
export const decrypt = (payload: string, key: Buffer): string => {
  const [version, iv, tag, ciphertext, ...rest] = payload.split(':');
  if (
    version !== VERSION ||
    iv === undefined ||
    tag === undefined ||
    ciphertext === undefined ||
    rest.length > 0
  ) {
    throw new CryptoError('Unsupported or malformed encrypted value');
  }
  const ivBytes = Buffer.from(iv, 'base64');
  const tagBytes = Buffer.from(tag, 'base64');
  if (ivBytes.length !== IV_BYTES || tagBytes.length !== TAG_BYTES) {
    throw new CryptoError('Unsupported or malformed encrypted value');
  }
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, ivBytes, {
      authTagLength: TAG_BYTES,
    });
    decipher.setAuthTag(tagBytes);
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new CryptoError('Decryption failed: wrong key or tampered value');
  }
};
