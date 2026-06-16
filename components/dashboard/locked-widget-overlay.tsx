import Link from "next/link";
import { Lock } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";

interface LockedWidgetOverlayProps {
  children: React.ReactNode;
  featureName: string;
  description?: string;
}

/** @deprecated Use `FeatureGate` from `./feature-gate` with `variant="overlay"` instead. */
export function LockedWidgetOverlay({
  children,
  featureName,
  description = "Unlock this feature to create better content and grow your audience",
}: LockedWidgetOverlayProps) {
  return (
    <div className="relative rounded-sm border border-border bg-card overflow-hidden">
      <div className="blur-sm p-4 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 bg-surface-2 flex flex-col items-center justify-center gap-2">
        <Lock className="size-6 text-muted-foreground" weight="bold" />
        <p className="text-sm font-medium text-foreground">{featureName}</p>
        <p className="text-xs text-muted-foreground text-center px-4">
          {description}
        </p>
        <Button variant="default" size="sm" asChild className="rounded-sm hover-scale mt-1">
          <Link href="/billing">Upgrade</Link>
        </Button>
      </div>
    </div>
  );
}
