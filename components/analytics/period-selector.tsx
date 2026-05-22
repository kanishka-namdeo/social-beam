"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

const PERIODS = [
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
] as const;

export function PeriodSelector({ currentPeriod }: { currentPeriod: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePeriodChange = (days: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("period", String(days));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
      {PERIODS.map((period) => (
        <Button
          key={period.value}
          variant="ghost"
          size="sm"
          onClick={() => handlePeriodChange(period.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            currentPeriod === period.value
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {period.label}
        </Button>
      ))}
    </div>
  );
}
