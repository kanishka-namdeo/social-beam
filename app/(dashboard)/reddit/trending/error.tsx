"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Warning } from "@phosphor-icons/react/ssr";

export default function TrendingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const loggedRef = useRef(false);
  useEffect(() => {
    if (!loggedRef.current) {
      loggedRef.current = true;
      fetch("/api/reddit/trending/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message, digest: error.digest }),
      }).catch(() => {});
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Warning className="mx-auto size-12 text-warning" weight="fill" />
          <CardTitle className="mt-3 text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while loading trending posts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Trending data updates automatically. Try refreshing or check back later.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="default" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh page
            </Button>
            <Button variant="outline" asChild>
              <a href="/reddit/trending">Back to Research</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
