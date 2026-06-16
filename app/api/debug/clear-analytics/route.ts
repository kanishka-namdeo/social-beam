import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspaceId || 'cb00516d621a641b5ac5e72cf';

    // 1. Get all posts for this workspace
    const posts = await prisma.post.findMany({
      where: { workspaceId },
      select: { id: true, title: true, isExternal: true },
    });

    const postIds = posts.map((p) => p.id);

    // 2. Delete all AnalyticsSnapshots for these posts
    const deletedSnapshots = await prisma.analyticsSnapshot.deleteMany({
      where: { postId: { in: postIds } },
    });

    // 3. Delete all PostPlatform entries for these posts
    const deletedPostPlatforms = await prisma.postPlatform.deleteMany({
      where: { postId: { in: postIds } },
    });

    // 4. Delete all posts
    const deletedPosts = await prisma.post.deleteMany({
      where: { workspaceId },
    });

    // 5. Delete all FollowerSnapshots
    const deletedFollowers = await prisma.followerSnapshot.deleteMany({
      where: { workspaceId },
    });

    // Reset lastSyncedAt on connected accounts
    await prisma.connectedAccount.updateMany({
      where: { workspaceId, platform: 'linkedin' },
      data: { lastSyncedAt: null },
    });

    return NextResponse.json({
      success: true,
      workspaceId,
      deleted: {
        analyticsSnapshots: deletedSnapshots.count,
        postPlatforms: deletedPostPlatforms.count,
        posts: deletedPosts.count,
        followerSnapshots: deletedFollowers.count,
      },
    });
  } catch (err) {
    return NextResponse.json({
      error: "Internal server error",
    }, { status: 500 });
  }
}
