import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface ReliabilityData {
  platform: string;
  total: number;
  published: number;
  failed: number;
  successRate: number;
  failRate: number;
}

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
};

export function PublishingReliabilityTable({ data }: { data: ReliabilityData[] }) {
  const overallSuccessRate = data.reduce((s, d) => s + d.published, 0) /
    Math.max(1, data.reduce((s, d) => s + d.total, 0));
  const overallFailRate = data.reduce((s, d) => s + d.failed, 0) /
    Math.max(1, data.reduce((s, d) => s + d.total, 0));

  return (
    <Card className="rounded-sm bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg font-medium tracking-tight">Publishing Reliability</CardTitle>
        <p className="text-sm text-muted-foreground">
          Post success rates across platforms
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid-auto-fill gap-4">
          <div className="rounded-sm border border-success/20 bg-success/5 p-4">
            <div className="text-sm font-medium tracking-tight text-muted-foreground">Overall Success Rate</div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-success">
              {(overallSuccessRate * 100).toFixed(1)}%
            </div>
          </div>
          <div className="rounded-sm border border-destructive/20 bg-destructive/5 p-4">
            <div className="text-sm font-medium tracking-tight text-muted-foreground">Overall Fail Rate</div>
            <div className="mt-1 text-2xl font-semibold font-mono tabular-nums text-destructive">
              {(overallFailRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Per-platform */}
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.platform} className="rounded-sm border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={d.successRate >= 0.9 ? "default" : d.successRate >= 0.7 ? "secondary" : "destructive"}
                    className="rounded-sm text-xs"
                  >
                    {(d.successRate * 100).toFixed(0)}%
                  </Badge>
                  <span className="text-sm font-medium tracking-tight">
                    {PLATFORM_DISPLAY_NAMES[d.platform] ?? d.platform}
                  </span>
                </div>
                <span className="text-xs font-mono tabular-nums text-muted-foreground">
                  {d.published}/{d.total} posts
                </span>
              </div>
              <Progress
                value={d.successRate * 100}
                className="mt-2 h-2"
              />
              {d.failed > 0 && (
                <div className="mt-1 text-xs text-destructive">
                  {d.failed} failed — check OAuth tokens
                </div>
              )}
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <div className="flex h-20 items-center justify-center text-sm text-muted-foreground">
            No publishing data yet — published posts will populate this section.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
