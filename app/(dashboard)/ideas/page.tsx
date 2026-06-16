import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { Lightbulb } from "@phosphor-icons/react/ssr";
import { IdeasBoard } from "@/components/ideas/ideas-board";

export default async function IdeasPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id?: string; workspaceId?: string };
  if (!user.id || !user.workspaceId) redirect("/login");

  if (!(await isOnboardingComplete(user.id))) {
    redirect("/onboarding");
  }

  const ideas = await prisma.idea.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Lightbulb className="w-8 h-8 text-brand" weight="fill" />
          Ideas Board
        </h1>
        <p className="mt-2 text-muted-foreground">
          Capture, organize, and convert content ideas into posts
        </p>
      </div>

      <IdeasBoard initialIdeas={ideas} />
    </div>
  );
}
