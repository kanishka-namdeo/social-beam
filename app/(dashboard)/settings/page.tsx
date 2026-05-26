import { auth } from "@/lib/auth";
import { getBrandContext } from "@/lib/db/brand-context";
import { redirect } from "next/navigation";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const workspaceId = (session.user as { workspaceId?: string }).workspaceId;
  if (!workspaceId) {
    redirect("/login");
  }

  const brandContext = await getBrandContext(workspaceId);

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

      <SettingsContent brandContext={brandContext} />
    </div>
  );
}
