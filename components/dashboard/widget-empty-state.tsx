import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EmptyStateConfig } from "@/lib/dashboard/widget-types";

interface WidgetEmptyStateProps extends EmptyStateConfig {
  className?: string;
}

/**
 * Consistent empty state for all widgets
 * Shows icon, message, optional description, and optional CTA
 */
export function WidgetEmptyState({
  icon,
  message,
  description,
  cta,
  className,
}: WidgetEmptyStateProps) {
  const ctaButton = cta && (
    <Button
      variant="outline"
      size="sm"
      className="mt-3 rounded-sm"
      asChild={!!cta.href}
      onClick={cta.onClick}
    >
      {cta.href ? <Link href={cta.href}>{cta.label}</Link> : cta.label}
    </Button>
  );

  return (
    <div
      className={cn(
        "flex h-full min-h-[120px] flex-col items-center justify-center gap-2 px-4 text-center",
        className
      )}
    >
      {icon && (
        <div className="text-muted-foreground/60 [&>svg]:size-8">
          {icon}
        </div>
      )}
      <p className="text-caption font-medium text-muted-foreground">{message}</p>
      {description && (
        <p className="text-micro text-muted-foreground/80">{description}</p>
      )}
      {ctaButton}
    </div>
  );
}
