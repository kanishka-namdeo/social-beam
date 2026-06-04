"use client";

import { useState, useCallback } from "react";
import { SubredditRecommendationBanner } from "@/components/reddit/subreddit-recommendation-banner";
import { SubredditManager } from "@/components/reddit/subreddit-manager";

interface RedditTrendingClientProps {
  hasBrandContext: boolean;
  industry?: string;
}

export function RedditTrendingClient({
  hasBrandContext,
  industry,
}: RedditTrendingClientProps) {
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [recommendationCount, setRecommendationCount] = useState(0);

  const handleOpenManager = useCallback(() => {
    setManagerDialogOpen(true);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setManagerDialogOpen(open);
  }, []);

  const handleRecommendationCountChange = useCallback((count: number) => {
    setRecommendationCount(count);
  }, []);

  return (
    <>
      {hasBrandContext && (
        <SubredditRecommendationBanner
          recommendationCount={recommendationCount}
          industry={industry}
          onOpenManager={handleOpenManager}
        />
      )}
      <SubredditManager
        dialogOpen={managerDialogOpen}
        onDialogOpenChange={handleDialogOpenChange}
        onRecommendationCountChange={handleRecommendationCountChange}
      />
    </>
  );
}
