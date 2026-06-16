"use client";

import { useMemo } from "react";
import { Funnel } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  categories: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function CategoryFilter({ categories, selected, onChange }: CategoryFilterProps) {
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cat of categories) {
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return counts;
  }, [categories]);

  const uniqueCategories = useMemo(
    () => Array.from(new Set(categories)).sort(),
    [categories]
  );

  if (uniqueCategories.length === 0) return null;

  const toggleCategory = (cat: string) => {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={selected.length > 0 ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5",
            selected.length > 0 && "bg-brand hover:bg-brand/90"
          )}
        >
          <Funnel className="size-4" weight={selected.length > 0 ? "fill" : "regular"} />
          <span className="hidden sm:inline">
            Categories{selected.length > 0 ? ` (${selected.length})` : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3">
        <div className="space-y-1">
          <div className="text-xs font-medium text-foreground mb-2">Filter by category</div>
          {uniqueCategories.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-muted transition-colors"
            >
              <Checkbox
                checked={selected.includes(cat)}
                onCheckedChange={() => toggleCategory(cat)}
              />
              <span className="text-sm text-foreground truncate flex-1">{cat}</span>
              <span className="text-micro text-muted-foreground tabular-nums">
                {categoryCounts.get(cat) ?? 0}
              </span>
            </label>
          ))}
          {selected.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 h-7 text-xs"
              onClick={() => onChange([])}
            >
              Clear all
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
