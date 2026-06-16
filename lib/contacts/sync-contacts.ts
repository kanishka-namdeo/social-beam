import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

export async function syncContactsFromEngagements(workspaceId: string): Promise<number> {
  const engagements = await prisma.engagementItem.findMany({
    where: {
      workspaceId,
      platform: 'linkedin',
      OR: [
        { authorProfileUrl: { not: null } },
        { authorHandle: { not: null } },
      ],
    },
    select: {
      authorName: true,
      authorProfileUrl: true,
      authorHandle: true,
      authorAvatar: true,
      createdAt: true,
    },
  });

  const uniquePeople = new Map<string, {
    name: string;
    profileUrl: string | null;
    handle: string | null;
    avatarUrl: string | null;
    lastEngagedAt: Date;
  }>();

  for (const eng of engagements) {
    const key = eng.authorProfileUrl || eng.authorHandle || eng.authorName || 'unknown';
    const existing = uniquePeople.get(key);

    if (!existing) {
      uniquePeople.set(key, {
        name: eng.authorName || 'Unknown',
        profileUrl: eng.authorProfileUrl || null,
        handle: eng.authorHandle || null,
        avatarUrl: eng.authorAvatar || null,
        lastEngagedAt: eng.createdAt,
      });
    } else {
      if (eng.createdAt > existing.lastEngagedAt) {
        existing.lastEngagedAt = eng.createdAt;
      }
      if (!existing.avatarUrl && eng.authorAvatar) {
        existing.avatarUrl = eng.authorAvatar;
      }
    }
  }

  let syncCount = 0;

  for (const person of uniquePeople.values()) {
    try {
      if (person.profileUrl) {
        await prisma.contact.upsert({
          where: {
            workspaceId_platform_profileUrl: {
              workspaceId,
              platform: 'linkedin',
              profileUrl: person.profileUrl,
            },
          },
          create: {
            workspaceId,
            platform: 'linkedin',
            name: person.name,
            profileUrl: person.profileUrl,
            handle: person.handle,
            avatarUrl: person.avatarUrl,
            source: 'engagement',
            lastEngagedAt: person.lastEngagedAt,
          },
          update: {
            name: person.name,
            handle: person.handle,
            avatarUrl: person.avatarUrl || undefined,
            lastEngagedAt: person.lastEngagedAt,
          },
        });
      } else {
        const existing = await prisma.contact.findFirst({
          where: {
            workspaceId,
            platform: 'linkedin',
            profileUrl: null,
            handle: person.handle,
          },
        });

        if (existing) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              name: person.name,
              avatarUrl: person.avatarUrl || existing.avatarUrl,
              lastEngagedAt: person.lastEngagedAt,
            },
          });
        } else {
          await prisma.contact.create({
            data: {
              workspaceId,
              platform: 'linkedin',
              name: person.name,
              handle: person.handle,
              avatarUrl: person.avatarUrl,
              source: 'engagement',
              lastEngagedAt: person.lastEngagedAt,
            },
          });
        }
      }
      syncCount++;
    } catch (err) {
      logger.warn('contacts.sync.upsert_failed', {
        workspaceId,
        name: person.name,
        profileUrl: person.profileUrl,
        error: String(err),
      });
    }
  }

  logger.info('contacts.sync.complete', {
    workspaceId,
    engagementsProcessed: engagements.length,
    contactsCreated: syncCount,
  });

  return syncCount;
}
