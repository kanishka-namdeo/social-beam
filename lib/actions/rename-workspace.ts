'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const renameSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be 50 characters or less'),
});

export async function renameWorkspace(workspaceId: string, name: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const parsed = renameSchema.safeParse({ workspaceId, name });
  if (!parsed.success) {
    return { error: parsed.error.flatten().formErrors[0] ?? 'Invalid input' };
  }

  const { workspaceId: wid, name: newName } = parsed.data;

  const workspace = await prisma.workspace.findUnique({
    where: { id: wid },
    select: { userId: true },
  });

  if (!workspace || workspace.userId !== session.user.id) {
    return { error: 'You do not own this workspace' };
  }

  await prisma.workspace.update({
    where: { id: wid },
    data: { name: newName },
  });

  revalidatePath('/(dashboard)');

  return { success: true };
}
