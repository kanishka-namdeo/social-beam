"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkle, X } from "@phosphor-icons/react/ssr";

interface SubredditRecommendationBannerProps {
  recommendationCount: number;
  industry?: string;
  onOpenManager: () => void;
}

const DISMISS_KEY = "sb:dismissed-subreddit-recs";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function SubredditRecommendationBanner({
  recommendationCount,
  industry,
  onOpenManager,
}: SubredditRecommendationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (stored) {
        const { timestamp } = JSON.parse(stored) as { timestamp: number };
        if (Date.now() - timestamp < DISMISS_DURATION_MS) {
          setDismissed(true);
        } else {
          localStorage.removeItem(DISMISS_KEY);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() }));
    } catch {
      // ignore storage errors
    }
  };

  if (dismissed || recommendationCount === 0) {
    return null;
  }

  const industryText = industry ? ` in ${industry}` : "";

  return (
    <Card className="border-brand/20 bg-gradient-to-r from-brand/5 to-transparent">
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-9 items-center justify-center rounded-full bg-brand/10 shrink-0">
            <Sparkle className="size-5 text-brand" weight="fill" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              Brand-matched subreddits found
              <Badge variant="secondary" className="text-xs">
                {recommendationCount} recommendations
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Based on your brand profile{industryText}, we&apos;ve identified {recommendationCount} relevant subreddits to track.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="default"
            size="sm"
            onClick={onOpenManager}
            className="gap-1.5"
          >
            <Sparkle className="size-3.5" weight="fill" />
            Review Recommendations
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="size-8 p-0 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss recommendation banner"
          >
            <X className="size-4" weight="bold" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
