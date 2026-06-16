import { CardHeader, CardTitle, CardDescription, CardAction } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WidgetHeaderConfig } from "@/lib/dashboard/widget-types";

interface WidgetHeaderProps extends WidgetHeaderConfig {
  className?: string;
  /** Whether to show the title text (defaults to true) */
  showTitle?: boolean;
}

/**
 * Standardized widget header with icon, title, description, and optional action
 */
export function WidgetHeader({
  title,
  icon,
  description,
  action,
  showTitle = true,
  className,
}: WidgetHeaderProps) {
  return (
    <CardHeader className={cn(
      "shrink-0 min-h-0",
      description ? "pb-3" : "pb-2",
      className
    )}>
      <div className="flex items-center gap-2 min-h-0">
        {icon && (
          <div className="flex size-4 shrink-0 items-center justify-center text-brand [&>svg]:size-4 [&>svg]:font-bold">
            {icon}
          </div>
        )}
        {showTitle && (
          <CardTitle className="text-body font-medium tracking-[var(--tracking-label)] text-foreground truncate">
            {title}
          </CardTitle>
        )}
        {action && <CardAction className="shrink-0">{action}</CardAction>}
      </div>
      {description && (
        <CardDescription className="text-caption truncate">
          {description}
        </CardDescription>
      )}
    </CardHeader>
  );
}
