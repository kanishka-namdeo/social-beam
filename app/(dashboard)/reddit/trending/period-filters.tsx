"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

const VALID_PERIODS = [6, 24, 168, 720] as const;
const PERIOD_LABELS: Record<number, string> = {
  6: "6h",
  24: "24h",
  168: "7d",
  720: "30d",
};

interface PeriodFiltersProps {
  hours: number;
  subredditFilter?: string;
}

export function PeriodFilters({ hours, subredditFilter }: PeriodFiltersProps) {
  return (
    <>
      {VALID_PERIODS.map((h) => (
        <Button
          key={h}
          variant={hours === h ? "outline" : "outline"}
          size="sm"
          asChild
          className={cn(
            hours === h && "bg-brand text-primary-foreground hover:bg-brand/90 hover:text-primary-foreground",
          )}
        >
          <Link href={`/reddit/trending?hours=${h}${subredditFilter ? `&subreddit=${subredditFilter}` : ""}`}>
            {PERIOD_LABELS[h]}
          </Link>
        </Button>
      ))}
    </>
  );
}
