"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkedInPreview } from "./linkedin-preview";
import { XPreview } from "./x-preview";
import { InstagramPreview } from "./instagram-preview";
import { FacebookPreview } from "./facebook-preview";
import { TikTokPreview } from "./tiktok-preview";
import { PinterestPreview } from "./pinterest-preview";
import { YoutubePreview } from "./youtube-preview";
import { GoogleBusinessPreview } from "./google-business-preview";
import { platformIcon, PLATFORM_DISPLAY_NAMES } from "@/lib/oauth/platform-icons";
import type { MediaAsset } from "@/lib/media/types";
import { MediaPreview } from "./media-preview";

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
  mediaAssets?: MediaAsset[];
}

function renderPreview(platform: string, content: string, title?: string, account?: ConnectedAccount, mediaUrls?: string[]) {
  const mediaComponent = mediaUrls && mediaUrls.length > 0 ? <MediaPreview mediaUrls={mediaUrls} className="mt-3" /> : null;
  switch (platform) {
    case "linkedin":
      return <LinkedInPreview content={content} account={account} mediaUrls={mediaUrls} />;
    case "x":
      return <XPreview content={content} account={account} mediaUrls={mediaUrls} />;
    case "instagram":
      return <InstagramPreview content={content} account={account} mediaUrls={mediaUrls} />;
    case "facebook":
      return <FacebookPreview content={content} account={account} mediaUrls={mediaUrls} />;
    case "tiktok":
      return <TikTokPreview content={content} account={account} mediaUrls={mediaUrls} />;
    case "pinterest":
      return <PinterestPreview content={content} title={title} account={account} mediaUrls={mediaUrls} />;
    case "threads":
      return <XPreview content={content} account={account} mediaUrls={mediaUrls} />;
    case "youtube":
      return <YoutubePreview content={content} title={title} account={account} mediaUrls={mediaUrls} />;
    case "googleBusiness":
      return <GoogleBusinessPreview content={content} account={account} mediaUrls={mediaUrls} />;
    case "bluesky":
      return <XPreview content={content} account={account} mediaUrls={mediaUrls} />;
    default:
      return null;
  }
}

export function PreviewPanel({ selectedPlatforms, content, title, connectedAccounts, mediaAssets = [] }: PreviewPanelProps) {
  if (selectedPlatforms.length === 0) {
    return null;
  }

  const mediaUrls = mediaAssets.map((a) => a.publicUrl);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground tracking-tight">Preview</h3>
        <p className="text-xs text-muted-foreground">
          See how your post will look on each platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {selectedPlatforms.map((platform) => {
          const account = connectedAccounts.find((a) => a.platform === platform);
          return (
            <Card key={platform} className="overflow-visible glass-strong rounded-sm">
              <div className="flex items-center gap-2 p-4 pb-0">
                <span className="text-muted-foreground">{platformIcon(platform)}</span>
                <span className="text-sm font-medium text-foreground">
                  {PLATFORM_DISPLAY_NAMES[platform]}
                </span>
                <Badge variant="secondary" className="ml-auto text-[10px] normal-case tracking-normal rounded-sm">
                  Preview
                </Badge>
              </div>
              <CardContent className="flex items-center justify-center p-4">
                {renderPreview(platform, content, title, account, mediaUrls)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
