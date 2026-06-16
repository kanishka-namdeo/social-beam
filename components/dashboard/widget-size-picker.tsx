"use client";

import { Check, ArrowsOut } from "@phosphor-icons/react/ssr";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getAllowedSizes } from "@/lib/dashboard/widget-registry";

interface WidgetSizePickerProps {
  widgetId: string;
  currentSize: string;
  onResize: (widgetId: string, newSizeToken: string) => void;
}

export function WidgetSizePicker({
  widgetId,
  currentSize,
  onResize,
}: WidgetSizePickerProps) {
  const allowedSizes = getAllowedSizes(widgetId);

  if (allowedSizes.length <= 1) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-7 w-7 min-h-7 min-w-7 flex items-center justify-center rounded-sm bg-card/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Resize widget"
                type="button"
              >
                <ArrowsOut className="size-3.5" weight="bold" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {allowedSizes.map((size) => (
                <DropdownMenuItem
                  key={size.token}
                  onClick={() => onResize(widgetId, size.token)}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    size.token === currentSize && "bg-accent"
                  )}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      size.token === currentSize
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                    weight="bold"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{size.token}</span>
                    <span className="text-xs text-muted-foreground">
                      {size.description}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Resize widget</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
