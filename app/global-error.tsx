"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Warning } from "@phosphor-icons/react/ssr";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to error tracking in production
    if (process.env.NODE_ENV === "production") {
      fetch("/api/compose/error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: error.message, digest: error.digest, page: "global" }),
      }).catch(() => {});
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <Warning className="mx-auto size-12 text-destructive" weight="fill" />
              <CardTitle className="mt-3 text-xl">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3">
              <Button variant="default" onClick={() => reset()}>
                Try again
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh page
              </Button>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  );
}
