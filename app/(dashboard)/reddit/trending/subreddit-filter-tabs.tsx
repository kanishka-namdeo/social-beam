"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SubredditConfig {
  subreddit: string;
}

interface SubredditFilterTabsProps {
  hours: number;
  subredditFilter?: string;
  subredditConfigs: SubredditConfig[];
}

export function SubredditFilterTabs({ hours, subredditFilter, subredditConfigs }: SubredditFilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={!subredditFilter ? "outline" : "outline"}
        size="sm"
        asChild
        className={cn(
          !subredditFilter && "bg-brand text-primary-foreground hover:bg-brand/90 hover:text-primary-foreground rounded-sm border-b-2 border-b-brand transition-colors",
          subredditFilter && "rounded-sm hover:bg-muted transition-colors",
        )}
      >
        <Link href={`/reddit/trending?hours=${hours}`}>
          All
        </Link>
      </Button>
      {subredditConfigs.map((cfg) => (
        <Button
          key={cfg.subreddit}
          variant={subredditFilter === cfg.subreddit ? "outline" : "outline"}
          size="sm"
          asChild
          className={cn(
            subredditFilter === cfg.subreddit && "bg-brand text-primary-foreground hover:bg-brand/90 hover:text-primary-foreground rounded-sm border-b-2 border-b-brand transition-colors",
            subredditFilter !== cfg.subreddit && "rounded-sm hover:bg-muted transition-colors",
          )}
        >
          <Link href={`/reddit/trending?hours=${hours}&subreddit=${cfg.subreddit}`}>
            r/{cfg.subreddit}
          </Link>
        </Button>
      ))}
    </div>
  );
}
