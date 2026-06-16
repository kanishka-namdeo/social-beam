import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignDetailClient } from "@/components/campaigns/campaign-detail";
import type { UserRole } from "@/lib/role-guard";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string; role?: UserRole } | undefined;
  const workspaceId = user?.workspaceId;

  if (!workspaceId) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Unable to load workspace.</p>
      </div>
    );
  }

  const campaign = await prisma.campaign.findFirst({
    where: { id: resolvedParams.id, workspaceId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          posts: {
            orderBy: { order: "asc" },
            include: {
              post: {
                include: {
                  PostPlatform: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!campaign) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
      </div>
    );
  }

  // Transform Prisma data to client-friendly shape
  const campaignData = {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    goal: campaign.goal,
    audience: campaign.audience,
    status: campaign.status,
    startDate: campaign.startDate?.toISOString() ?? null,
    endDate: campaign.endDate?.toISOString() ?? null,
    duration: campaign.duration ?? null,
  };

  const phases = campaign.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    type: phase.phase,
    description: phase.description,
    order: phase.order,
    posts: phase.posts.map((cp) => ({
      id: cp.post.id,
      status: cp.post.status,
      scheduledAt: cp.post.scheduledAt?.toISOString() ?? null,
      PostPlatform: cp.post.PostPlatform.map((pp) => ({
        platform: pp.platform,
        content: pp.content,
      })),
      platform: cp.post.PostPlatform[0]?.platform ?? "unknown",
      content: cp.post.PostPlatform[0]?.content ?? "",
    })),
  }));

  return (
    <CampaignDetailClient
      campaign={campaignData}
      phases={phases}
      userRole={user?.role ?? "FREE_USER"}
    />
  );
}
