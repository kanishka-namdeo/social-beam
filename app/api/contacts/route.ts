import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { revalidatePath } from 'next/cache';

const createContactSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  name: z.string().min(1, 'Name is required'),
  profileUrl: z.string().url().optional().or(z.literal('')),
  handle: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  headline: z.string().max(200).optional(),
});

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const q = searchParams.get('q');
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    const where: any = { workspaceId };

    if (platform) {
      where.platform = platform;
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { handle: { contains: q, mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { lastEngagedAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = contacts.length > limit;
    const data = hasMore ? contacts.slice(0, limit) : contacts;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    log.info('contacts.list.success', { workspaceId, count: data.length });
    return NextResponse.json({ data, nextCursor });
  } catch (err) {
    logger.error('contacts.list.exception', { error: String(err), requestId });
    return NextResponse.json({ error: 'Failed to list contacts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { platform, name, profileUrl, handle, avatarUrl, headline } = parsed.data;

    let extractedHandle = handle;
    if (!extractedHandle && profileUrl) {
      const match = profileUrl.match(/\/in\/([^/]+)/);
      extractedHandle = match?.[1] ?? undefined;
    }

    const contact = await prisma.contact.create({
      data: {
        workspaceId,
        platform,
        name,
        profileUrl: profileUrl || null,
        handle: extractedHandle || null,
        avatarUrl: avatarUrl || null,
        headline: headline || null,
        source: 'manual',
      },
    });

    revalidatePath('/dashboard/settings/contacts');

    revalidatePath('/dashboard/settings/contacts');

    log.info('contacts.create.success', { workspaceId, contactId: contact.id });
    return NextResponse.json({ contact }, { status: 201 });
  } catch (err) {
    logger.error('contacts.create.exception', { error: String(err), requestId });
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
