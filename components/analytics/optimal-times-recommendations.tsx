"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { HeatmapSlot } from "@/components/analytics/types";
import { useInvisibleAI } from "@/lib/invisible-ai-context";

interface PlatformMetric {
  platform: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PLATFORM_DISPLAY_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  pinterest: "Pinterest",
};

interface Props {
  heatmapData: HeatmapSlot[];
  platformMetrics: PlatformMetric[];
}

export function OptimalTimesRecommendations({ heatmapData, platformMetrics }: Props) {
  const { config } = useInvisibleAI();
  // Find top time slots by engagement
  const topSlots = [...heatmapData]
    .filter((s) => s.postCount >= 2)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 5);

  // Find best performing platform
  const bestPlatform = [...platformMetrics].sort((a, b) => b.engagementRate - a.engagementRate)[0];

  // Find worst performing platform
  const worstPlatform = [...platformMetrics].sort((a, b) => a.engagementRate - b.engagementRate)[0];

  // Recommendations
  const recommendations = generateRecommendations(topSlots, bestPlatform, worstPlatform, heatmapData, platformMetrics);

  return (
    <Card className="rounded-sm bg-ai-surface border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <span className="text-foreground">Smart Recommendations</span>
          {config.showAIInsightsBadge && (
            <Badge variant="outline" className="rounded-sm text-xs">AI Insights</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Data-driven suggestions to improve your social performance
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="rounded-sm border p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-brand text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-medium tracking-tight">{rec.title}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Post more content to start receiving personalized recommendations.
          </div>
        )}

        {topSlots.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium tracking-tight">Your Best Performing Times</h4>
              <div className="mt-2 space-y-1">
                {topSlots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between rounded-sm px-2 py-1 text-xs">
                    <span className="font-mono tabular-nums">
                      {DAY_NAMES[slot.dayOfWeek]} at {String(slot.hour).padStart(2, "0")}:00
                    </span>
                    <Badge variant="secondary" className="rounded-sm text-xs font-mono tabular-nums">
                      {slot.avgEngagement.toFixed(1)} avg engagement
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function generateRecommendations(
  topSlots: HeatmapSlot[],
  bestPlatform: PlatformMetric | undefined,
  worstPlatform: PlatformMetric | undefined,
  allHeatmap: HeatmapSlot[],
  platforms: PlatformMetric[]
): Array<{ title: string; description: string }> {
  const recs: Array<{ title: string; description: string }> = [];

  // Time-based recommendations
  if (topSlots.length > 0) {
    const bestSlot = topSlots[0];
    recs.push({
      title: "Post during your peak engagement window",
      description: `Your highest engagement occurs on ${DAY_NAMES[bestSlot.dayOfWeek]}s at ${String(bestSlot.hour).padStart(2, "0")}:00. Consider scheduling your most important posts during this time.`,
    });
  }

  // Platform performance recommendations
  if (bestPlatform && worstPlatform && bestPlatform.platform !== worstPlatform.platform) {
    recs.push({
      title: `${PLATFORM_DISPLAY_NAMES[bestPlatform.platform]} is your strongest platform`,
      description: `It has a ${(bestPlatform.engagementRate * 100).toFixed(1)}% engagement rate vs ${(worstPlatform.engagementRate * 100).toFixed(1)}% on ${PLATFORM_DISPLAY_NAMES[worstPlatform.platform]}. Prioritize high-quality content for your top-performing platform.`,
    });
  }

  // Consistency recommendation
  const activeSlots = allHeatmap.filter((s) => s.postCount > 0);
  const uniqueDays = new Set(activeSlots.map((s) => s.dayOfWeek)).size;
  if (uniqueDays < 5) {
    recs.push({
      title: "Spread your posting across more days",
      description: `You currently post on ${uniqueDays} day(s) per week. Accounts that post consistently across 5+ days see 40% higher overall engagement.`,
    });
  }

  // Platform diversification
  if (platforms.length < 3) {
    recs.push({
      title: "Connect more platforms",
      description: `You have ${platforms.length} connected platform(s). Cross-posting to 3+ platforms can increase your total reach by up to 3x with minimal extra effort.`,
    });
  }

  return recs.slice(0, 4);
}
