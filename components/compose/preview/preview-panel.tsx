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
  signature?: { text: string; url?: string } | null;
}

function renderPreview(platform: string, content: string, title?: string, account?: ConnectedAccount, mediaUrls?: string[], signature?: { text: string; url?: string } | null) {
  const mediaComponent = mediaUrls && mediaUrls.length > 0 ? <MediaPreview mediaUrls={mediaUrls} className="mt-3" /> : null;
  switch (platform) {
    case "linkedin":
      return <LinkedInPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "x":
      return <XPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "instagram":
      return <InstagramPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "facebook":
      return <FacebookPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "tiktok":
      return <TikTokPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "pinterest":
      return <PinterestPreview content={content} title={title} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "threads":
      return <XPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "youtube":
      return <YoutubePreview content={content} title={title} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "googleBusiness":
      return <GoogleBusinessPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    case "bluesky":
      return <XPreview content={content} account={account} mediaUrls={mediaUrls} signature={signature} />;
    default:
      return null;
  }
}

export function PreviewPanel({ selectedPlatforms, content, title, connectedAccounts, mediaAssets = [], signature }: PreviewPanelProps) {
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

      <div className="grid-auto-fill gap-preview">
        {selectedPlatforms.map((platform) => {
          const account = connectedAccounts.find((a) => a.platform === platform);
          return (
            <Card key={platform} className="overflow-visible rounded-sm">
              <div className="flex-between p-preview pb-0">
                <span className="text-muted-foreground">{platformIcon(platform)}</span>
                <span className="text-sm font-medium text-foreground">
                  {PLATFORM_DISPLAY_NAMES[platform]}
                </span>
                <Badge variant="secondary" className="ml-auto text-micro normal-case tracking-normal rounded-sm">
                  Preview
                </Badge>
              </div>
              <CardContent className="flex-center p-preview">
                {renderPreview(platform, content, title, account, mediaUrls, signature)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
