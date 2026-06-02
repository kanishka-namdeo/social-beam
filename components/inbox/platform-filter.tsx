"use client";

import { cn } from "@/lib/utils";
import { InstagramLogo, MetaLogo, XLogo, LinkedinLogo, TiktokLogo } from "@phosphor-icons/react";

interface PlatformFilterProps {
  platforms: string[];
  selectedPlatform: string | null;
  onChange: (platform: string | null) => void;
}

const platformConfig: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  instagram: { label: "Instagram", icon: InstagramLogo },
  facebook: { label: "Facebook", icon: MetaLogo },
  x: { label: "X", icon: XLogo },
  linkedin: { label: "LinkedIn", icon: LinkedinLogo },
  tiktok: { label: "TikTok", icon: TiktokLogo },
};

export function PlatformFilter({ platforms, selectedPlatform, onChange }: PlatformFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "px-3 py-1.5 text-xs rounded-sm border border-border transition-colors",
          !selectedPlatform
            ? "bg-brand-soft text-brand border-brand/30"
            : "bg-card text-muted-foreground hover:bg-muted",
        )}
      >
        All
      </button>
      {platforms.map((p) => {
        const config = platformConfig[p];
        if (!config) return null;
        const Icon = config.icon;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(selectedPlatform === p ? null : p)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm border border-border transition-colors",
              selectedPlatform === p
                ? "bg-brand-soft text-brand border-brand/30"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-3.5" />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
