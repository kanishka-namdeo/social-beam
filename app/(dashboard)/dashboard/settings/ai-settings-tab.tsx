'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gear } from '@phosphor-icons/react';

export function AiSettingsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Settings</CardTitle>
        <CardDescription>
          Configure AI guardrails, autonomy levels, and safety filters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
          <Gear className="size-8 text-muted-foreground" weight="light" />
          <p className="text-sm text-muted-foreground">
            AI Settings configuration is coming soon.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
