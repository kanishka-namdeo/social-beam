import { prisma } from '@/lib/prisma';

export interface AuthorizationCode {
  userId: string;
  workspaceId: string;
  role: string;
  scopes: string[];
  codeChallenge: string;
  redirectUri: string;
  clientId: string;
  expiresAt: number;
}

export async function storeAuthorizationCode(code: string, data: AuthorizationCode): Promise<void> {
  await prisma.mcpAuthorizationCode.create({
    data: {
      code,
      userId: data.userId,
      workspaceId: data.workspaceId,
      role: data.role,
      scopes: data.scopes.join(' '),
      codeChallenge: data.codeChallenge,
      codeChallengeMethod: 'S256',
      redirectUri: data.redirectUri,
      clientId: data.clientId,
      expiresAt: new Date(data.expiresAt),
    },
  });
}

export async function getAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
  const record = await prisma.mcpAuthorizationCode.findUnique({
    where: { code },
  });
  if (!record || record.usedAt !== null) return null;
  return {
    userId: record.userId,
    workspaceId: record.workspaceId,
    role: record.role,
    scopes: record.scopes.split(' '),
    codeChallenge: record.codeChallenge,
    redirectUri: record.redirectUri,
    clientId: record.clientId,
    expiresAt: record.expiresAt.getTime(),
  };
}

export async function consumeAuthorizationCode(code: string): Promise<void> {
  await prisma.mcpAuthorizationCode.update({
    where: { code },
    data: { usedAt: new Date() },
  });
}

export async function atomicConsumeAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
  const result = await prisma.$transaction(async (tx) => {
    const record = await tx.mcpAuthorizationCode.findUnique({
      where: { code },
    });
    if (!record || record.usedAt !== null) return null;

    await tx.mcpAuthorizationCode.update({
      where: { code },
      data: { usedAt: new Date() },
    });

    return record;
  });

  if (!result) return null;

  return {
    userId: result.userId,
    workspaceId: result.workspaceId,
    role: result.role,
    scopes: result.scopes.split(' '),
    codeChallenge: result.codeChallenge,
    redirectUri: result.redirectUri,
    clientId: result.clientId,
    expiresAt: result.expiresAt.getTime(),
  };
}

export async function cleanupExpiredCodes(): Promise<void> {
  // Clean up expired codes and codes that were used more than 24 hours ago
  // (used codes are kept briefly for debugging/auditing before purging)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await prisma.mcpAuthorizationCode.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { usedAt: { lt: oneDayAgo } },
      ],
    },
  });
}
