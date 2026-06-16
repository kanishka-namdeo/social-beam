import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';

const getSecret = () => {
  const secret = process.env.MCP_JWT_SECRET;
  if (!secret) {
    throw new Error('MCP_JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
};

export async function revokeToken(token: string): Promise<void> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      audience: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp`,
    });

    const jti = payload.jti as string | undefined;
    const exp = payload.exp;
    const userId = payload.sub;

    if (!jti || !exp || !userId) return;

    await prisma.mcpRevokedToken.create({
      data: {
        jti,
        userId,
        expiresAt: new Date(exp * 1000),
      },
    });
  } catch {
    // Token is invalid/expired - nothing to revoke
  }
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      audience: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp`,
    });

    const jti = payload.jti as string | undefined;
    if (!jti) return false;

    return isTokenRevokedByJti(jti);
  } catch {
    return true;
  }
}

/**
 * Check if a token has been revoked by its JTI claim.
 * Used by verifyMcpToken to avoid double-parsing the JWT.
 */
export async function isTokenRevokedByJti(jti: string): Promise<boolean> {
  const revoked = await prisma.mcpRevokedToken.findUnique({ where: { jti } });
  return revoked !== null;
}

export async function cleanupExpiredRevocations(): Promise<void> {
  await prisma.mcpRevokedToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}
