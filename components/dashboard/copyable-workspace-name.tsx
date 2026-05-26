"use client";

import { toast } from "sonner";

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
    <span
      className="cursor-pointer text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      onClick={handleCopy}
      title="Click to copy workspace name"
    >
      {workspaceName}
    </span>
  );
}
