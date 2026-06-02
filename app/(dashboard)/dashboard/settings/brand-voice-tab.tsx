'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkle } from '@phosphor-icons/react/ssr';

export function BrandVoiceTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand Voice Setup</CardTitle>
        <CardDescription>
          Configure your brand voice by uploading guidelines, past posts, and tone samples.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
          <Sparkle className="size-8 text-muted-foreground" weight="light" />
          <p className="text-sm text-muted-foreground">
            Brand Voice configuration is coming soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
