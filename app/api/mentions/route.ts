import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { searchLinkedInTypeahead, typeaheadToMentionSuggestion } from '@/lib/linkedin/typeahead';

interface MentionSuggestion {
  id: string;
  label: string;
  platform: string;
  avatarUrl: string | null;
  type: 'account' | 'recent' | 'typeahead' | 'contact';
  headline?: string;
  linkedinType?: 'person' | 'organization';
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    const user = session?.user as { id?: string; workspaceId?: string } | undefined;

    if (!user?.id || !user?.workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();
    const platformsParam = searchParams.get('platforms') ?? '';
    const platforms = platformsParam
      ? platformsParam.split(',').map((p) => p.trim()).filter(Boolean)
      : [];

    logger.debug('api.mentions.request', { userId: user.id, q, platforms });

    const suggestions: MentionSuggestion[] = [];
    const seenKeys = new Set<string>();

    // 1. Connected accounts (highest priority)
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: {
        workspaceId: user.workspaceId,
        status: 'connected',
        ...(platforms.length > 0 ? { platform: { in: platforms } } : {}),
      },
      select: {
        platformUserId: true,
        platformUsername: true,
        platform: true,
        avatarUrl: true,
      },
    });

    for (const account of connectedAccounts) {
      const handle = account.platformUsername ? `@${account.platformUsername}` : `@${account.platformUserId}`;
      const label = account.platformUsername ?? account.platformUserId;
      const key = `${account.platform}:${handle.toLowerCase()}`;

      if (q && !label.toLowerCase().startsWith(q.toLowerCase()) && !handle.toLowerCase().startsWith(q.toLowerCase())) {
        continue;
      }

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        suggestions.push({
          id: handle,
          label,
          platform: account.platform,
          avatarUrl: account.avatarUrl,
          type: 'account',
        });
      }
    }

    // 2. Recent mentions from published posts
    const recentPosts = await prisma.postPlatform.findMany({
      where: {
        platform: platforms.length > 0 ? { in: platforms } : undefined,
        status: 'PUBLISHED',
        Post: { workspaceId: user.workspaceId },
      },
      select: {
        platform: true,
        content: true,
        Post: { select: { publishedAt: true } },
      },
      orderBy: { Post: { publishedAt: 'desc' } },
      take: 50,
    });

    const mentionRegex = /@([a-zA-Z0-9._]{1,30})/g;
    const recentMentions: MentionSuggestion[] = [];

    for (const post of recentPosts) {
      const matches = post.content.matchAll(mentionRegex);
      for (const match of matches) {
        const handle = `@${match[1]}`;
        const key = `${post.platform}:${handle.toLowerCase()}`;

        if (!seenKeys.has(key)) {
          seenKeys.add(key);

          if (q && !handle.toLowerCase().startsWith(q.toLowerCase())) {
            continue;
          }

          recentMentions.push({
            id: handle,
            label: match[1],
            platform: post.platform,
            avatarUrl: null,
            type: 'recent',
          });
        }
      }
    }

    suggestions.push(...recentMentions);

    // 2.5. Saved contacts
    const contacts = await prisma.contact.findMany({
      where: {
        workspaceId: user.workspaceId,
        ...(platforms.length > 0 ? { platform: { in: platforms } } : {}),
        ...(q ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { handle: { contains: q, mode: 'insensitive' } },
          ]
        } : {}),
      },
      orderBy: { lastEngagedAt: 'desc' },
      take: 10,
    });

    for (const contact of contacts) {
      const key = `${contact.platform}:${contact.profileUrl ?? contact.name}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        suggestions.push({
          id: contact.profileUrl ?? contact.handle ?? contact.name,
          label: contact.name,
          platform: contact.platform,
          avatarUrl: contact.avatarUrl,
          type: 'contact',
          headline: contact.headline ?? undefined,
        });
      }
    }

    // 3. LinkedIn typeahead (real-time search)
    // Only search if LinkedIn is in the selected platforms (or no platforms specified)
    // and there's a query to search for
    const shouldSearchLinkedIn = platforms.length === 0 || platforms.includes('linkedin');
    if (shouldSearchLinkedIn && q.length >= 2) {
      try {
        logger.debug('api.mentions.linkedin_typeahead_attempt', { workspaceId: user.workspaceId, query: q });
        const linkedinResults = await searchLinkedInTypeahead(user.workspaceId, q, 5);
        logger.debug('api.mentions.linkedin_typeahead_results', { count: linkedinResults.length });
        
        for (const result of linkedinResults) {
          const suggestion = typeaheadToMentionSuggestion(result);
          const key = `linkedin:${result.urn}`;

          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            suggestions.push(suggestion);
          }
        }
      } catch (error) {
        // Typeahead may not be available - log but don't fail
        logger.error('api.mentions.linkedin_typeahead_error', { 
          error: String(error),
          workspaceId: user.workspaceId,
          query: q 
        });
      }
    }

    logger.debug('api.mentions.response', { 
      totalSuggestions: suggestions.length,
      hasTypeahead: suggestions.some(s => s.type === 'typeahead')
    });

    return NextResponse.json(suggestions.slice(0, 15));
  } catch (error) {
    logger.error('api.mentions.error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
