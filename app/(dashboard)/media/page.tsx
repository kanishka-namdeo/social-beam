import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { redirect } from "next/navigation";
import { MediaLibrary } from "@/components/media/media-library";

export default async function MediaPage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const [assets, total, connectedAccounts] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        width: true,
        height: true,
        publicUrl: true,
        status: true,
        tags: true,
        createdAt: true,
      },
    }),
    prisma.mediaAsset.count({
      where: { workspaceId: user.workspaceId },
    }),
    prisma.connectedAccount.findMany({
      where: { workspaceId: user.workspaceId, status: "connected" },
      select: { platform: true },
    }),
  ]);

  const connectedPlatforms = connectedAccounts.map((a) => a.platform);

  return (
    <MediaLibrary
      initialAssets={assets}
      total={total}
      connectedPlatforms={connectedPlatforms}
    />
  );
}
