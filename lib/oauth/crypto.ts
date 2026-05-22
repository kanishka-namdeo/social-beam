import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { logger } from '@/lib/logger';

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error(
    'TOKEN_ENCRYPTION_KEY environment variable is required for token encryption'
  );
}

const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');

if (KEY_BUFFER.length !== 32) {
  throw new Error(
    `TOKEN_ENCRYPTION_KEY must be a 32-byte hex string, got ${KEY_BUFFER.length} bytes`
  );
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns a base64-encoded string: IV(16) + AUTH_TAG(16) + CIPHERTEXT
 */
export function encryptToken(text: string): string {
  try {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', KEY_BUFFER, iv);

    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]).toString(
      'base64'
    );
  } catch (err) {
    logger.error('oauth.crypto.encrypt_failed', { error: String(err) });
    throw err;
  }
}

/**
 * Decrypts a base64-encoded string produced by encryptToken.
 */
export function decryptToken(encrypted: string): string {
  try {
    const data = Buffer.from(encrypted, 'base64');
    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const ciphertext = data.subarray(32);

    const decipher = createDecipheriv('aes-256-gcm', KEY_BUFFER, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    logger.error('oauth.crypto.decrypt_failed', { error: String(err) });
    throw err;
  }
}
