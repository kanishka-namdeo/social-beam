"use client";

import { TrendUp, TrendDown, Eye, Heart, CursorClick, Users } from "@phosphor-icons/react/ssr";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MetricCardData } from "@/lib/analytics/metric-cards-utils";

const ICON_MAP: Record<MetricCardData["iconKey"], typeof Eye> = {
  eye: Eye,
  heart: Heart,
  cursorClick: CursorClick,
  trendUp: TrendUp,
  users: Users,
};

interface MetricCardsProps {
  metrics: MetricCardData[];
}

function MetricCard({ label, value, change, iconKey }: MetricCardData) {
  const isPositive = change >= 0;
  const Icon = ICON_MAP[iconKey];

  return (
    <Card className="rounded-sm border-l-2 border-l-brand hover-lift">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium tracking-tight text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold font-mono tabular-nums tracking-tight text-foreground mt-1">
              {value}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-muted">
            <Icon className="size-5 text-muted-foreground" weight="fill" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-1">
          {isPositive ? (
            <TrendUp className="size-4 text-success" weight="bold" />
          ) : (
            <TrendDown className="size-4 text-destructive" weight="bold" />
          )}
          <span
            className={cn(
              "text-xs font-medium font-mono tabular-nums",
              isPositive ? "text-success" : "text-destructive"
            )}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">vs previous period</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
