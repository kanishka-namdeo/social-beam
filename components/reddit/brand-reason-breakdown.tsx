"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Users,
  Target,
  Sparkle,
  Megaphone,
  Warning,
  X,
  ChatCircleText,
  ShieldWarning,
} from "@phosphor-icons/react/ssr";

interface BrandReasonBreakdownProps {
  brandReasonTags: string[];
  relevanceScore: number | null;
  relevanceReason: string | null;
  children: React.ReactNode;
}

const REASON_TAG_META: Record<string, { icon: React.ReactNode; label: string; category: "match" | "risk" | "neutral" }> = {
  audience_match: { icon: <Users className="size-3.5" weight="fill" />, label: "Audience match", category: "match" },
  industry_relevant: { icon: <Target className="size-3.5" weight="fill" />, label: "Industry relevant", category: "match" },
  goal_aligned: { icon: <Sparkle className="size-3.5" weight="fill" />, label: "Goal aligned", category: "match" },
  voice_match: { icon: <Megaphone className="size-3.5" weight="fill" />, label: "Voice match", category: "match" },
  banned_word_risk: { icon: <Warning className="size-3.5" weight="fill" />, label: "Banned word risk", category: "risk" },
  voice_mismatch: { icon: <X className="size-3.5" weight="fill" />, label: "Voice mismatch", category: "risk" },
  competitor_mention: { icon: <ChatCircleText className="size-3.5" weight="fill" />, label: "Competitor mention", category: "neutral" },
  content_gap: { icon: <ShieldWarning className="size-3.5" weight="fill" />, label: "Content gap", category: "neutral" },
  audience_pain_point: { icon: <Users className="size-3.5" weight="fill" />, label: "Audience pain point", category: "match" },
};

function getCategoryColor(category: string): string {
  switch (category) {
    case "match": return "bg-success/10 text-success border-success/20";
    case "risk": return "bg-destructive/10 text-destructive border-destructive/20";
    case "neutral": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

function getCategoryIcon(category: string): React.ReactNode {
  switch (category) {
    case "match": return <Sparkle className="size-3" weight="fill" />;
    case "risk": return <Warning className="size-3" weight="fill" />;
    case "neutral": return <ChatCircleText className="size-3" />;
    default: return null;
  }
}

function formatTagDescription(tag: string): string {
  const descriptions: Record<string, string> = {
    audience_match: "Topic matches your audience interests or demographics",
    industry_relevant: "Directly relates to your industry or market",
    goal_aligned: "Supports one of your stated business goals",
    voice_match: "Topic tone aligns with your brand voice",
    banned_word_risk: "May contain themes or language from your banned words list",
    voice_mismatch: "Tone or framing may conflict with your brand voice",
    competitor_mention: "Mentions or relates to one of your tracked competitors",
    content_gap: "Represents a content opportunity not currently covered",
    audience_pain_point: "Addresses a known pain point of your target audience",
  };
  return descriptions[tag] ?? tag.replace(/_/g, " ");
}

export function BrandReasonBreakdown({ brandReasonTags, relevanceScore, relevanceReason, children }: BrandReasonBreakdownProps) {
  if (brandReasonTags.length === 0) {
    return <>{children}</>;
  }

  const matchTags = brandReasonTags.filter((t) => REASON_TAG_META[t]?.category === "match");
  const riskTags = brandReasonTags.filter((t) => REASON_TAG_META[t]?.category === "risk");
  const neutralTags = brandReasonTags.filter((t) => REASON_TAG_META[t]?.category === "neutral");

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
              Why this matters for your brand
            </p>
            {relevanceReason && (
              <p className="text-xs text-muted-foreground">{relevanceReason}</p>
            )}
          </div>

          <Separator />

          {matchTags.length > 0 && (
            <div className="space-y-2">
              {matchTags.map((tag) => {
                const meta = REASON_TAG_META[tag];
                if (!meta) return null;
                return (
                  <div key={tag} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-success">{meta.icon}</span>
                    <div className="flex-1">
                      <span className="font-medium text-foreground">{meta.label}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatTagDescription(tag)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {riskTags.length > 0 && (
            <>
              {matchTags.length > 0 && <Separator />}
              <div className="space-y-2">
                {riskTags.map((tag) => {
                  const meta = REASON_TAG_META[tag];
                  if (!meta) return null;
                  return (
                    <div key={tag} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-destructive">{meta.icon}</span>
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{meta.label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTagDescription(tag)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {neutralTags.length > 0 && (
            <>
              {(matchTags.length > 0 || riskTags.length > 0) && <Separator />}
              <div className="space-y-2">
                {neutralTags.map((tag) => {
                  const meta = REASON_TAG_META[tag];
                  if (!meta) return null;
                  return (
                    <div key={tag} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 text-muted-foreground">{meta.icon}</span>
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{meta.label}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatTagDescription(tag)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function BrandReasonPill({ tag }: { tag: string }) {
  const meta = REASON_TAG_META[tag];
  if (!meta) {
    return (
      <Badge variant="outline" className="text-xs normal-case tracking-tight">
        {tag.replace(/_/g, " ")}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn("text-xs normal-case tracking-tight gap-1", getCategoryColor(meta.category))}
    >
      {meta.icon}
      {meta.label}
    </Badge>
  );
}
