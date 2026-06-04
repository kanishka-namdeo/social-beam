import { auth } from "@/lib/auth";
import { getBrandContext } from "@/lib/db/brand-context";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SettingsContent } from "./settings-content";
import type { UserRole } from "@/lib/role-guard";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = (session.user as { id?: string }).id;
  const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
  if (!workspaceId) {
    redirect("/login");
  }

  const brandContext = await getBrandContext(workspaceId);

  let userRole: UserRole = "FREE_USER";
  if (userId) {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    userRole = (dbUser?.role as UserRole) ?? "FREE_USER";
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-0">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace configuration, brand voice, and AI guardrails.
        </p>
      </div>

      <SettingsContent brandContext={brandContext} userRole={userRole} />
    </div>
  );
}
