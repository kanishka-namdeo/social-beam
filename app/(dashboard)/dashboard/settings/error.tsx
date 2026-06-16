"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Warning } from "@phosphor-icons/react/ssr";

export default function DashboardSettingsError({
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
      Sentry.captureException(error, {
        tags: {
          component: "DashboardSettingsError",
        },
        extra: {
          digest: error.digest,
        },
      });
      fetch("/api/compose/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message, digest: error.digest, page: "dashboard-settings" }),
      }).catch(() => {});
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Warning className="mx-auto size-12 text-warning" weight="fill" />
          <CardTitle className="mt-3 text-xl">Failed to load settings</CardTitle>
          <CardDescription>
            An error occurred while loading your settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center gap-3">
            <Button variant="default" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard">Go to Dashboard</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
