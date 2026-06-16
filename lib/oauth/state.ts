import crypto from 'crypto';

const OAUTH_STATE_COOKIE_PREFIX = '__oauth_state_';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface StoredState {
  platform: string;
  userId: string;
  workspaceId: string;
  codeVerifier?: string;
  redirectTo: string;
}

export function generateOAuthStateId(): string {
  return crypto.randomUUID();
}

export function encodeOAuthState(state: StoredState): string {
  const stateId = generateOAuthStateId();
  const payload = {
    ...state,
    id: stateId,
    createdAt: Date.now(),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const hmac = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'fallback')
    .update(encoded)
    .digest('hex')
    .slice(0, 16);
  return `${stateId}.${encoded}.${hmac}`;
}

export function decodeOAuthState(stateString: string): StoredState | null {
  const parts = stateString.split('.');
  if (parts.length !== 3) return null;

  const [stateId, encoded, hmac] = parts;

  const expectedHmac = crypto
    .createHmac('sha256', process.env.AUTH_SECRET || 'fallback')
    .update(`${stateId}.${encoded}`)
    .digest('hex')
    .slice(0, 16);

  if (hmac !== expectedHmac) return null;

  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    if (Date.now() - decoded.createdAt > OAUTH_STATE_TTL_MS) return null;
    return decoded as StoredState;
  } catch {
    return null;
  }
}

export function getOAuthStateCookieName(): string {
  return `${OAUTH_STATE_COOKIE_PREFIX}id`;
}
