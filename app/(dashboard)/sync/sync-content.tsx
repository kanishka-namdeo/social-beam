"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InstagramLogo,
  XLogo,
  LinkedinLogo,
  MetaLogo,
  TiktokLogo,
  PinterestLogo,
  ThreadsLogo,
  GoogleLogo,
  YoutubeLogo,
  ChatCircleText,
  ArrowClockwise,
} from "@phosphor-icons/react/ssr";
import { SyncButton } from "@/components/sync/sync-button";
import { SyncLogSheet } from "@/components/sync/sync-log-sheet";
import { PLATFORM_CAPABILITIES } from "@/lib/sync/platform-capabilities";
import { toast } from "sonner";

interface ConnectedAccount {
  platform: string;
  platformUsername: string | null;
  lastSyncedAt: Date | null;
}

interface SyncContentProps {
  connectedAccounts: ConnectedAccount[];
}

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramLogo className="size-8" weight="fill" />,
  facebook: <MetaLogo className="size-8" weight="fill" />,
  x: <XLogo className="size-8" weight="fill" />,
  linkedin: <LinkedinLogo className="size-8" weight="fill" />,
  tiktok: <TiktokLogo className="size-8" weight="fill" />,
  pinterest: <PinterestLogo className="size-8" weight="fill" />,
  threads: <ThreadsLogo className="size-8" weight="fill" />,
  googleBusiness: <GoogleLogo className="size-8" weight="fill" />,
  youtube: <YoutubeLogo className="size-8" weight="fill" />,
  bluesky: <ChatCircleText className="size-8" weight="fill" />,
};

const platformNames: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  threads: "Threads",
  googleBusiness: "Google Business",
  youtube: "YouTube",
  bluesky: "Bluesky",
};

export function SyncContent({ connectedAccounts }: SyncContentProps) {
  const [syncingAll, setSyncingAll] = useState(false);
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [logSheetJobId, setLogSheetJobId] = useState<string | null>(null);
  const [logSheetPlatform, setLogSheetPlatform] = useState<string | null>(null);

  const handleSyncAll = async () => {
    setSyncingAll(true);
    const syncableAccounts = connectedAccounts.filter((account) => {
      const cap = PLATFORM_CAPABILITIES[account.platform];
      return cap && cap.syncMethod !== "none";
    });

    let successCount = 0;
    let errorCount = 0;

    for (const account of syncableAccounts) {
      try {
        const res = await fetch("/api/sync/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform: account.platform }),
        });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setSyncingAll(false);
    if (errorCount === 0) {
      toast.success(`Started sync for ${successCount} platform${successCount !== 1 ? "s" : ""}`);
    } else {
      toast.error(`Synced ${successCount}, failed ${errorCount}`);
    }
  };

  if (connectedAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <ArrowClockwise className="size-12 text-muted-foreground" weight="light" />
          <p className="text-sm font-medium text-foreground">No connected accounts</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Connect your social accounts to start syncing data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const syncableCount = connectedAccounts.filter((account) => {
    const cap = PLATFORM_CAPABILITIES[account.platform];
    return cap && cap.syncMethod !== "none";
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {connectedAccounts.length} connected account{connectedAccounts.length !== 1 ? "s" : ""} •{" "}
            {syncableCount} syncable
          </p>
        </div>
        <Button
          variant="default"
          onClick={handleSyncAll}
          disabled={syncingAll || syncableCount === 0}
          className="gap-2"
        >
          <ArrowClockwise className={`size-4 ${syncingAll ? "animate-spin" : ""}`} weight="bold" />
          {syncingAll ? "Syncing..." : "Sync All"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {connectedAccounts.map((account) => {
          const capability = PLATFORM_CAPABILITIES[account.platform];
          const isSyncable = capability && capability.syncMethod !== "none";
          const lastSync = account.lastSyncedAt
            ? new Date(account.lastSyncedAt).toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Never synced";

          return (
            <Card key={account.platform} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                      {platformIcons[account.platform]}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {platformNames[account.platform] || account.platform}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {account.platformUsername || "Connected"}
                      </CardDescription>
                    </div>
                  </div>
                  {capability && (
                    <Badge
                      variant={capability.syncMethod === "api" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {capability.syncMethod === "api" ? "API" : capability.syncMethod === "browser" ? "Browser" : "N/A"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {capability?.syncLabel || "No sync available"}
                  </p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ArrowClockwise className="size-3" />
                    {lastSync}
                  </p>
                </div>
                {isSyncable ? (
                  <SyncButton
                    platform={account.platform}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onViewLogs={(id) => {
                      setLogSheetJobId(id);
                      setLogSheetPlatform(account.platform);
                      setLogSheetOpen(true);
                    }}
                  />
                ) : (
                  <Button variant="outline" size="sm" disabled className="w-full">
                    Coming soon
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <SyncLogSheet
        jobId={logSheetJobId}
        platform={logSheetPlatform}
        open={logSheetOpen}
        onOpenChange={setLogSheetOpen}
      />
    </div>
  );
}
