"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, GearSix, PencilSimple } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkspaceRenameDialog } from "./workspace-rename-dialog";

interface WorkspaceDropdownProps {
  workspaceName: string;
  workspaceId: string;
}

export function WorkspaceDropdown({ workspaceName, workspaceId }: WorkspaceDropdownProps) {
  const [open, setOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(workspaceName);
      toast.success("Workspace name copied");
    } catch {
      toast.error("Failed to copy workspace name");
    }
    setOpen(false);
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            aria-label={`Workspace: ${workspaceName}`}
          >
            {workspaceName}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="truncate max-w-48">{workspaceName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopy}>
            <Copy className="size-3.5" />
            Copy name
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <GearSix className="size-3.5" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setRenameOpen(true); setOpen(false); }}>
            <PencilSimple className="size-3.5" />
            Rename workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <WorkspaceRenameDialog
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        currentName={workspaceName}
        workspaceId={workspaceId}
      />
    </>
  );
}
