export type MetricCardIconKey = "eye" | "heart" | "cursorClick" | "trendUp" | "users";

export interface MetricCardData {
  label: string;
  value: string;
  change: number;
  iconKey: MetricCardIconKey;
}

export function buildMetricCards({
  totalImpressions,
  prevImpressions,
  totalEngagements,
  prevEngagements,
  totalClicks,
  prevClicks,
  avgEngagementRate,
  prevEngagementRate,
  netFollowers,
  prevFollowers,
}: {
  totalImpressions: number;
  prevImpressions: number;
  totalEngagements: number;
  prevEngagements: number;
  totalClicks: number;
  prevClicks: number;
  avgEngagementRate: number;
  prevEngagementRate: number;
  netFollowers: number;
  prevFollowers: number;
}): MetricCardData[] {
  const pctChange = (current: number, prev: number): number => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return ((current - prev) / prev) * 100;
  };

  return [
    {
      label: "Total Impressions",
      value: totalImpressions.toLocaleString(),
      change: pctChange(totalImpressions, prevImpressions),
      iconKey: "eye",
    },
    {
      label: "Total Engagements",
      value: totalEngagements.toLocaleString(),
      change: pctChange(totalEngagements, prevEngagements),
      iconKey: "heart",
    },
    {
      label: "Total Clicks",
      value: totalClicks.toLocaleString(),
      change: pctChange(totalClicks, prevClicks),
      iconKey: "cursorClick",
    },
    {
      label: "Avg Engagement Rate",
      value: `${(avgEngagementRate * 100).toFixed(1)}%`,
      change: pctChange(avgEngagementRate, prevEngagementRate),
      iconKey: "trendUp",
    },
    {
      label: "Net Follower Growth",
      value: netFollowers > 0 ? `+${netFollowers.toLocaleString()}` : netFollowers.toLocaleString(),
      change: pctChange(netFollowers, prevFollowers),
      iconKey: "users",
    },
  ];
}
