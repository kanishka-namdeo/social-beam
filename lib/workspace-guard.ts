import { prisma } from '@/lib/prisma';

export async function verifyWorkspaceOwnership(workspaceId: string, userId: string): Promise<boolean> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId, userId },
  });
  return !!workspace;
}
