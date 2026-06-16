"use client";

import { Badge } from "@/components/ui/badge";
import { Sparkle, UserCircle } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { BaseWidget } from "@/components/dashboard/base-widget";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives } from "@/lib/dashboard/widget-types";

interface ProfileAnalysisCardProps {
  title?: string;
  description?: string;
  profile: {
    tone?: string | null;
    postTypes?: Record<string, unknown> | null;
    audience?: Record<string, unknown> | null;
    bio?: Record<string, unknown> | null;
  };
  size?: WidgetSizeToken;
}

const toneLabels: Record<string, string> = {
  professional: "Professional",
  casual: "Casual",
  witty: "Witty",
  educational: "Educational",
  inspirational: "Inspirational",
  bold: "Bold",
};

export function ProfileAnalysisCard({
  title = "Profile Analysis",
  description = "AI-generated insights from your onboarding session",
  profile,
  size = "10x3",
}: ProfileAnalysisCardProps) {
  const { isCompact, isWide, isTall } = getSizeDerivatives(size);
  const tone = profile.tone ? toneLabels[profile.tone] ?? profile.tone : null;
  const postTypes = profile.postTypes;
  const audience = profile.audience;
  const bio = profile.bio;

  const hasData = tone || (postTypes && Object.keys(postTypes).length > 0) || audience || (bio && bio.industry);

  return (
    <BaseWidget
      size={size}
      isEmpty={!hasData}
      emptyState={{
        icon: <UserCircle className="size-8" weight="light" />,
        message: "No profile analysis",
        description: "Complete onboarding to see your brand profile analysis.",
        cta: {
          label: "Connect Account",
          href: "/settings/accounts",
        },
      }}
      header={{
        title,
        icon: <Sparkle weight="fill" />,
        description: !isCompact ? description : undefined,
      }}
    >
      <div className={cn(
        "grid gap-grid",
        isCompact ? "grid-cols-2" : isWide ? "grid-cols-4" : "grid-cols-3"
      )}>
        {tone && (
          <div className="space-y-control min-w-0">
            <p className="text-caption font-semibold uppercase tracking-tight text-muted-foreground">
              Brand Tone
            </p>
            <Badge variant="default" className="text-micro rounded-sm truncate max-w-full">
              {tone}
            </Badge>
          </div>
        )}
        {postTypes && (
          <div className="space-y-control min-w-0">
            <p className="text-caption font-semibold uppercase tracking-tight text-muted-foreground">
              Content Mix
            </p>
            <div className="flex flex-wrap gap-tight min-w-0">
              {Object.entries(postTypes).map(([type, value]) => (
                <Badge key={type} variant="outline" className="text-micro rounded-sm truncate max-w-full">
                  {type}: {typeof value === "number" ? `${value}%` : String(value)}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {audience && (
          <div className="space-y-control min-w-0">
            <p className="text-caption font-semibold uppercase tracking-tight text-muted-foreground">
              Audience
            </p>
            <p className="text-body text-foreground truncate">
              {Array.isArray(audience.interests)
                ? audience.interests.slice(0, 3).join(", ")
                : "Profiled"}
            </p>
          </div>
        )}
        {bio != null && bio.industry != null && (
          <div className="space-y-control min-w-0">
            <p className="text-caption font-semibold uppercase tracking-tight text-muted-foreground">
              Industry
            </p>
            <p className="text-body text-foreground truncate">
              {String(bio.industry)}
            </p>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
