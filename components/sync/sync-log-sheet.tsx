"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogViewer } from "./log-viewer";

interface SyncLogSheetProps {
  jobId: string | null;
  platform: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SyncLogSheet({ jobId, platform, open, onOpenChange }: SyncLogSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {platform ? `Sync Logs: ${platform}` : 'Sync Logs'}
          </SheetTitle>
        </SheetHeader>
        {jobId ? (
          <LogViewer jobId={jobId} className="flex-1 min-h-0 mt-4" />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            No job selected
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
