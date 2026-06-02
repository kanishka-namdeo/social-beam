"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { platformIcon } from "@/lib/oauth/platform-icons";
import { cn } from "@/lib/utils";

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
    <Card className="rounded-sm border border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium tracking-tight">Platform Comparison</CardTitle>
        <CardDescription>Metrics across connected platforms</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-border bg-muted/20">
            <p className="text-sm text-muted-foreground">Connect accounts to see platform metrics.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-sm border border-border">
      <CardHeader>
        <CardTitle className="text-base font-medium tracking-tight">Platform Comparison</CardTitle>
        <CardDescription>Performance breakdown by platform</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="py-2 px-3 text-left font-medium tracking-tight uppercase text-xs text-muted-foreground">Platform</th>
                <th className="py-2 px-3 text-right font-medium tracking-tight uppercase text-xs text-muted-foreground">Impressions</th>
                <th className="py-2 px-3 text-right font-medium tracking-tight uppercase text-xs text-muted-foreground">Engagements</th>
                <th className="py-2 px-3 text-right font-medium tracking-tight uppercase text-xs text-muted-foreground">Eng. Rate</th>
                <th className="py-2 px-3 text-right font-medium tracking-tight uppercase text-xs text-muted-foreground">Clicks</th>
                <th className="py-2 px-3 text-right font-medium tracking-tight uppercase text-xs text-muted-foreground">Followers</th>
                <th className="py-2 px-3 text-right font-medium tracking-tight uppercase text-xs text-muted-foreground">Net Change</th>
              </tr>
            </thead>
            <tbody>
              {platformMetrics.map((m) => (
                <tr key={m.platform} className="border-b border-border/50 even:bg-muted/30 hover:bg-muted/50">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{platformIcon(m.platform)}</span>
                      <span className="capitalize font-medium text-foreground">{m.platform}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">{m.impressions.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">{m.engagements.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className="rounded-sm text-xs">
                      {(m.engagementRate * 100).toFixed(1)}%
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">{m.clicks.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums text-foreground">{m.followers.toLocaleString()}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={cn(
                      "font-medium font-mono tabular-nums",
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
