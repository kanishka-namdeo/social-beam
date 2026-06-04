import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 403 });
  }

  const debug: Record<string, unknown> = {};

  try {
    const linkedinAccounts = await prisma.connectedAccount.findMany({
      where: { platform: 'linkedin', status: 'connected' },
      select: {
        id: true,
        workspaceId: true,
        platformUserId: true,
        platformUsername: true,
        sessionCookie: true,
        cookieExpiry: true,
        lastSyncedAt: true,
      },
    });

    debug.linkedinAccountCount = linkedinAccounts.length;
    debug.linkedinAccounts = linkedinAccounts.map((a) => ({
      workspaceId: a.workspaceId.slice(0, 12) + '...',
      platformUsername: a.platformUsername,
      hasSessionCookie: !!a.sessionCookie,
      cookieExpiry: a.cookieExpiry?.toISOString() || null,
      lastSyncedAt: a.lastSyncedAt?.toISOString() || null,
    }));

    for (const a of linkedinAccounts) {
      const ws = a.workspaceId;
      const posts = await prisma.post.findMany({
        where: { workspaceId: ws },
        include: { PostPlatform: { where: { platform: 'linkedin' } } },
      });

      const snapshots = await prisma.analyticsSnapshot.findMany({
        where: { postId: { in: posts.map((p) => p.id) } },
      });

      const externalPosts = posts.filter((p) => p.isExternal);
      const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');

      (debug as Record<string, unknown>)[`workspace_${ws.slice(0, 12)}`] = {
        totalPosts: posts.length,
        externalPosts: externalPosts.length,
        publishedPosts: publishedPosts.length,
        analyticsSnapshots: snapshots.length,
        sampleExternalPosts: externalPosts.slice(0, 3).map((p) => ({
          id: p.id.slice(0, 8),
          title: (p.title ?? '').slice(0, 80),
          publishedAt: p.publishedAt?.toISOString(),
        })),
        sampleSnapshots: snapshots.slice(0, 3).map((s) => ({
          likes: s.likes,
          comments: s.comments,
          shares: s.shares,
          impressions: s.impressions,
          engagementRate: s.engagementRate,
          snapshotAt: s.snapshotAt.toISOString(),
        })),
      };
    }

    return NextResponse.json(debug);
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
