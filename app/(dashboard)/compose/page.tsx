import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { redirect } from "next/navigation";
import { ComposeForm } from "@/components/compose/compose-form";

export default async function ComposePage() {
  const session = await auth();
  const user = session?.user as { id?: string; workspaceId?: string } | undefined;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const connectedAccounts = await prisma.connectedAccount.findMany({
    where: { workspaceId: user.workspaceId, status: "connected" },
    select: {
      platform: true,
      platformUsername: true,
      avatarUrl: true,
      followerCount: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <ComposeForm
        connectedAccounts={connectedAccounts}
      />
    </div>
  );
}
