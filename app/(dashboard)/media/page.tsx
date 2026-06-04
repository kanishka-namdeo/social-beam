import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { redirect } from "next/navigation";
import { MediaLibrary } from "@/components/media/media-library";
import { getBrandContext } from "@/lib/db/brand-context";

function computeBrandSearchQuery(brandContext: {
  trainingStatus: string;
  industry: string | null;
  interests: string[];
  productDesc: string | null;
  PlatformContext: Array<{ visualStyle: string | null }>;
} | null): string {
  if (!brandContext || brandContext.trainingStatus !== "trained") return "";

  const parts: string[] = [];

  if (brandContext.industry) parts.push(brandContext.industry);
  if (brandContext.interests?.length) parts.push(brandContext.interests.slice(0, 3).join(" "));
  if (brandContext.productDesc) {
    const words = brandContext.productDesc.split(/\s+/).slice(0, 3).join(" ");
    parts.push(words);
  }

  const visualStyles = brandContext.PlatformContext
    .map((pc) => pc.visualStyle)
    .filter(Boolean)
    .slice(0, 2) as string[];
  if (visualStyles.length) parts.push(visualStyles.join(" "));

  return parts.join(" ").split(/\s+/).slice(0, 10).join(" ").trim();
}

export default async function MediaPage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const [assets, total, connectedAccounts, brandContext] = await Promise.all([
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
    getBrandContext(user.workspaceId),
  ]);

  const connectedPlatforms = connectedAccounts.map((a) => a.platform);
  const brandSearchQuery = computeBrandSearchQuery(brandContext);

  return (
    <div className="stagger-1">
      <MediaLibrary
        initialAssets={assets}
        total={total}
        connectedPlatforms={connectedPlatforms}
        brandSearchQuery={brandSearchQuery}
      />
    </div>
  );
}
