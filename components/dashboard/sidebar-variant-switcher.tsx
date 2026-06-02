"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSidebarPreference } from "@/lib/utils/sidebar-state";
import { cn } from "@/lib/utils";

interface SidebarVariantSwitcherProps {
  className?: string;
}

export function SidebarVariantSwitcher({ className }: SidebarVariantSwitcherProps) {
  const { config, setCollapsible } = useSidebarPreference();

  return (
    <div className={cn("space-y-6", className)}>
      <div>
        <h3 className="text-lg font-medium tracking-tight">Sidebar</h3>
        <p className="text-sm text-muted-foreground">
          Customize how the sidebar looks and behaves.
        </p>
      </div>

      {/* Icon-Only Mode Toggle */}
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
