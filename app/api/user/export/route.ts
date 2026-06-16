import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Fetch all user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        Workspace: {
          include: {
            Post: {
              include: {
                AnalyticsSnapshot: true,
                PostPlatform: true,
              },
            },
            ConnectedAccount: true,
            BrandContext: true,
            BrandVoice: true,
            Campaign: {
              include: {
                phases: true,
                posts: true,
              },
            },
            EngagementItem: true,
            Contact: true,
            MediaAsset: true,
            PostSignature: true,
            Idea: true,
            CalendarNote: true,
          },
        },
        Subscription: true,
        Notification: true,
        ConsentLog: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Structure the export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      workspaces: user.Workspace.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        timezone: workspace.timezone,
        createdAt: workspace.createdAt,
        posts: workspace.Post.map((post) => ({
          id: post.id,
          title: post.title,
          content: post.content,
          status: post.status,
          scheduledAt: post.scheduledAt,
          publishedAt: post.publishedAt,
          createdAt: post.createdAt,
          analytics: post.AnalyticsSnapshot,
          platforms: post.PostPlatform,
        })),
        connectedAccounts: workspace.ConnectedAccount.map((account) => ({
          id: account.id,
          platform: account.platform,
          platformUsername: account.platformUsername,
          status: account.status,
          createdAt: account.createdAt,
        })),
        brandContext: workspace.BrandContext,
        brandVoice: workspace.BrandVoice,
        campaigns: workspace.Campaign.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          phases: campaign.phases,
          posts: campaign.posts,
        })),
        engagementItems: workspace.EngagementItem,
        contacts: workspace.Contact,
        mediaAssets: workspace.MediaAsset.map((asset) => ({
          id: asset.id,
          originalName: asset.originalName,
          mimeType: asset.mimeType,
          publicUrl: asset.publicUrl,
          createdAt: asset.createdAt,
        })),
        signatures: workspace.PostSignature,
        ideas: workspace.Idea,
        calendarNotes: workspace.CalendarNote,
      })),
      subscription: user.Subscription,
      notifications: user.Notification,
      consent: user.ConsentLog,
    };

    logger.info('api.user.export.success', { userId, workspaceCount: user.Workspace.length });

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="socialbeam-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    logger.error('api.user.export.error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
