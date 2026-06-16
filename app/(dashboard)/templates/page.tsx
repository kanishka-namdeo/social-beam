import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotePencil } from "@phosphor-icons/react/ssr";
import { TemplateLibrary } from "@/components/templates/template-library";

export default async function TemplatesPage() {
  const session = await auth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session?.user as any;

  if (!user?.id || !user?.workspaceId) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <NotePencil className="size-6 text-brand" weight="fill" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Manage reusable post templates to speed up your content creation
          </p>
        </div>
      </div>
      <TemplateLibrary />
    </div>
  );
}
