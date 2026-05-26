"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  SidebarVariant,
  useSidebarPreference,
} from "@/lib/utils/sidebar-state";
import { cn } from "@/lib/utils";

interface SidebarVariantSwitcherProps {
  className?: string;
}

export function SidebarVariantSwitcher({ className }: SidebarVariantSwitcherProps) {
  const { config, setVariant, setCollapsible } = useSidebarPreference();

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-medium">Sidebar Style</h3>
        <p className="text-sm text-muted-foreground">
          Customize the layout, collapse behavior, and visual style.
        </p>
      </div>

      {/* Variant Selection */}
      <div className="space-y-3">
        <Label>Layout</Label>
        <RadioGroup
          value={config.variant}
          onValueChange={(value) => setVariant(value as SidebarVariant)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {/* Fixed */}
          <div
            className={cn(
              "relative cursor-pointer rounded-lg border-2 p-4 transition-all",
              config.variant === "sidebar"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            )}
            onClick={() => setVariant("sidebar")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="sidebar" id="variant-fixed" />
                <Label htmlFor="variant-fixed" className="cursor-pointer">
                  Fixed
                </Label>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Edge-anchored panel. Classic layout with clear spatial boundaries.
            </p>
            {/* Mini preview */}
            <div className="mt-3 flex h-12 gap-1 rounded-md border border-border/50 bg-muted/30 p-1">
              <div className="w-3 rounded-sm bg-sidebar" />
              <div className="flex-1 rounded-sm bg-background" />
            </div>
          </div>

          {/* Floating */}
          <div
            className={cn(
              "relative cursor-pointer rounded-lg border-2 p-4 transition-all",
              config.variant === "floating"
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/50"
            )}
            onClick={() => setVariant("floating")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="floating" id="variant-floating" />
                <Label htmlFor="variant-floating" className="cursor-pointer">
                  Floating
                </Label>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Detached card with shadow. Modern SaaS feel with visual separation.
            </p>
            {/* Mini preview */}
            <div className="mt-3 flex h-12 gap-1 rounded-md border border-border/50 bg-muted/30 p-1">
              <div className="w-3 rounded-sm border border-border bg-sidebar shadow-sm" />
              <div className="flex-1 rounded-sm bg-background" />
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Compact Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="compact-mode">Icon-Only Mode</Label>
          <p className="text-sm text-muted-foreground">
            Collapse sidebar to icon rail for more content space.
          </p>
        </div>
        <Switch
          id="compact-mode"
          checked={config.collapsible === "icon"}
          onCheckedChange={(checked) =>
            setCollapsible(checked ? "icon" : "offcanvas")
          }
        />
      </div>
    </div>
  );
}
