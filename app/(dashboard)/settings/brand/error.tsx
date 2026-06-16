'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Warning } from '@phosphor-icons/react/ssr';

export default function BrandSettingsError({
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
          component: 'BrandSettingsError',
        },
        extra: {
          digest: error.digest,
        },
      });
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Warning className="mx-auto size-12 text-destructive" weight="fill" />
          <CardTitle className="mt-3 text-xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while loading brand settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Your brand settings are saved. Try again or contact support for assistance.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="default" onClick={() => reset()}>
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh page
            </Button>
            <Button variant="outline" asChild>
              <a href="/contact">Contact support</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
