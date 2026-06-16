import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CampaignListClient } from "@/components/campaigns/campaign-list";
import type { UserRole } from "@/lib/role-guard";

export default async function CampaignsPage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string; role?: UserRole } | undefined;
  const workspaceId = user?.workspaceId;

  if (!workspaceId) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-foreground">Campaigns</h1>
        <p className="text-sm text-muted-foreground">Unable to load workspace.</p>
      </div>
    );
  }

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId },
    include: {
      phases: {
        select: {
          id: true,
          name: true,
          phase: true,
          order: true,
          _count: { select: { posts: true } },
        },
        orderBy: { order: "asc" },
      },
      _count: { select: { phases: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Transform Prisma data to match client component types
  const transformedCampaigns = campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    goal: c.goal,
    audience: c.audience,
    status: c.status,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    duration: c.duration,
    createdAt: c.createdAt.toISOString(),
    phases: c.phases.map((p) => ({
      id: p.id,
      name: p.name,
      phase: p.phase,
      order: p.order,
      _count: { posts: p._count.posts },
    })),
    _count: { phases: c._count.phases },
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-xl font-semibold text-foreground tracking-tight">Campaigns</h1>
      <CampaignListClient
        initialCampaigns={transformedCampaigns}
        userRole={user?.role ?? "FREE_USER"}
      />
    </div>
  );
}
