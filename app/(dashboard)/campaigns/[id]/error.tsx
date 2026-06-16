'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { WarningCircle } from '@phosphor-icons/react/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CampaignDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: {
        component: 'CampaignDetailError',
      },
      extra: {
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="border-destructive/50 bg-card">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <WarningCircle className="size-6 text-destructive" weight="fill" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                Failed to load campaign
              </h2>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred while loading the campaign details. If this issue persists, contact support.
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={reset} variant="outline" className="min-h-10">
                Try again
              </Button>
              <Button variant="outline" asChild className="min-h-10">
                <a href="/contact">Contact support</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
