"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  InstagramLogo,
  MetaLogo,
  XLogo,
  LinkedinLogo,
  TiktokLogo,
  PinterestLogo,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <InstagramLogo className="size-5" weight="fill" />,
  facebook: <MetaLogo className="size-5" weight="fill" />,
  x: <XLogo className="size-5" weight="fill" />,
  linkedin: <LinkedinLogo className="size-5" weight="fill" />,
  tiktok: <TiktokLogo className="size-5" weight="fill" />,
  pinterest: <PinterestLogo className="size-5" weight="fill" />,
};

interface PlatformComparisonProps {
  platformMetrics: Array<{
    platform: string;
    impressions: number;
    engagements: number;
    engagementRate: number;
    clicks: number;
    followers: number;
    netFollowers: number;
  }>;
}

export function PlatformComparison({ platformMetrics }: PlatformComparisonProps) {
  if (platformMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Comparison</CardTitle>
          <CardDescription>Metrics across connected platforms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Connect accounts to see platform metrics.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Platform Comparison</CardTitle>
        <CardDescription>Performance breakdown by platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Platform</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Impressions</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Engagements</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Eng. Rate</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Clicks</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Followers</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Net Change</th>
              </tr>
            </thead>
            <tbody>
              {platformMetrics.map((m) => (
                <tr key={m.platform} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{platformIcons[m.platform]}</span>
                      <span className="capitalize font-medium text-foreground">{m.platform}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right text-foreground">{m.impressions.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-foreground">{m.engagements.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className="text-xs">
                      {(m.engagementRate * 100).toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right text-foreground">{m.clicks.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right text-foreground">{m.followers.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn(
                      "font-medium",
                      m.netFollowers >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {m.netFollowers >= 0 ? "+" : ""}{m.netFollowers.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
