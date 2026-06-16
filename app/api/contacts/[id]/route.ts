import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = (session.user as { workspaceId?: string }).workspaceId ?? '';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Missing workspace ID' }, { status: 400 });
    }

    const { id: contactId } = await params;

    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    if (contact.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.contact.delete({
      where: { id: contactId },
    });

    revalidatePath('/dashboard/settings/contacts');

    revalidatePath('/dashboard/settings/contacts');

    log.info('contacts.delete.success', { workspaceId, contactId });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error('contacts.delete.exception', { error: String(err), requestId });
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
