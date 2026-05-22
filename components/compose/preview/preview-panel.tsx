"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkedInPreview } from "./linkedin-preview";
import { XPreview } from "./x-preview";
import { InstagramPreview } from "./instagram-preview";
import { FacebookPreview } from "./facebook-preview";
import { TikTokPreview } from "./tiktok-preview";
import { PinterestPreview } from "./pinterest-preview";
import { platformIcon, PLATFORM_DISPLAY_NAMES } from "@/lib/oauth/platform-icons";

interface ConnectedAccount {
  platform: string;
  platformUsername: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
}

interface PreviewPanelProps {
  selectedPlatforms: string[];
  content: string;
  title?: string;
  connectedAccounts: ConnectedAccount[];
}

function renderPreview(platform: string, content: string, title?: string, account?: ConnectedAccount) {
  switch (platform) {
    case "linkedin":
      return <LinkedInPreview content={content} account={account} />;
    case "x":
      return <XPreview content={content} account={account} />;
    case "instagram":
      return <InstagramPreview content={content} account={account} />;
    case "facebook":
      return <FacebookPreview content={content} account={account} />;
    case "tiktok":
      return <TikTokPreview content={content} account={account} />;
    case "pinterest":
      return <PinterestPreview content={content} title={title} account={account} />;
    default:
      return null;
  }
}

export function PreviewPanel({ selectedPlatforms, content, title, connectedAccounts }: PreviewPanelProps) {
  if (selectedPlatforms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Preview</h3>
        <p className="text-xs text-muted-foreground">
          See how your post will look on each platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {selectedPlatforms.map((platform) => {
          const account = connectedAccounts.find((a) => a.platform === platform);
          return (
            <Card key={platform} className="overflow-visible">
              <div className="flex items-center gap-2 p-4 pb-0">
                <span className="text-muted-foreground">{platformIcon(platform)}</span>
                <span className="text-sm font-medium text-foreground">
                  {PLATFORM_DISPLAY_NAMES[platform]}
                </span>
                <Badge variant="secondary" className="ml-auto text-[10px] normal-case tracking-normal">
                  Preview
                </Badge>
              </div>
              <CardContent className="flex items-center justify-center p-4">
                {renderPreview(platform, content, title, account)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
