"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CopyableWorkspaceNameProps {
  workspaceName: string;
}

export function CopyableWorkspaceName({ workspaceName }: CopyableWorkspaceNameProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(workspaceName);
      toast.success("Workspace name copied");
    } catch {
      toast.error("Failed to copy workspace name");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      onClick={handleCopy}
      title="Click to copy workspace name"
      aria-label={`Copy workspace name "${workspaceName}"`}
    >
      {workspaceName}
    </Button>
  );
}
