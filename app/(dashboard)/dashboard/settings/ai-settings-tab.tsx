'use client';

import { Sparkle } from '@phosphor-icons/react/ssr';

export function AiSettingsTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-12 text-center">
      <Sparkle className="size-8 text-muted-foreground mb-3" weight="light" />
      <p className="text-sm font-medium text-foreground">AI settings use defaults</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Customize AI behavior like tone, content length, and brand voice adherence. Changes apply immediately.
      </p>
      <p className="text-xs text-muted-foreground mt-2 text-muted-foreground/60">
        Configuration coming soon.
      </p>
    </div>
  );
}
