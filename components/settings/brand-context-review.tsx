"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkle,
  Users,
  Target,
  Megaphone,
  Globe,
  ChatCircle,
  CheckCircle,
  PencilSimple,
  ArrowRight,
  Spinner,
  CaretDown,
  CaretRight,
  Heart,
  Repeat,
  ArrowFatUp,
  Eye,
  ArrowsCounterClockwise,
} from "@phosphor-icons/react/ssr";

interface SamplePost {
  platform: string;
  content: string;
}

interface PlatformContext {
  platform: string;
  platformTone?: string;
  postingCadence?: string;
  visualStyle?: string;
  engagementStyle?: string;
  contentMix?: unknown;
  hashtagStrategy?: unknown;
  platformRules?: string[];
}

interface BrandContextReviewProps {
  draft: Record<string, unknown>;
  platforms: Record<string, unknown>;
  samples: SamplePost[];
  onConfirm: (edits: Record<string, string>) => void;
  onFeedback: (text: string) => void;
  onEditToggle: () => void;
  isStreaming: boolean;
  isSaving: boolean;
  connectedPlatforms?: string[];
  accountDetails?: Record<string, { platformUsername?: string; followerCount?: number }>;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Globe className="size-3" />,
  instagram: <Globe className="size-3" />,
  x: <Globe className="size-3" />,
  facebook: <Globe className="size-3" />,
  tiktok: <Globe className="size-3" />,
  pinterest: <Globe className="size-3" />,
};

const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  x: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
  tiktok: 2200,
  pinterest: 500,
};

const SECTION_KEYS = {
  identity: "identity",
  voice: "voice",
  audience: "audience",
  goals: "goals",
  samples: "samples",
  platforms: "platforms",
} as const;

function field(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value) && value.length > 0) return value.join(", ");
  return "";
}

// Confidence helpers — derive from draft confidence metadata if present
function getConfidence(
  draft: Record<string, unknown>,
  fieldName: string
): { level: "high" | "medium" | "suggested"; reason: string } {
  const meta = draft._confidence as Record<string, { level?: string; reason?: string }> | undefined;
  const entry = meta?.[fieldName];
  const level = (entry?.level ?? "medium") as "high" | "medium" | "suggested";
  const reason = entry?.reason ?? DEFAULT_CONFIDENCE_REASONS[fieldName] ?? "AI-generated from available signals";
  return { level, reason };
}

const DEFAULT_CONFIDENCE_REASONS: Record<string, string> = {
  businessName: "Extracted directly from website meta tags or logo text",
  tagline: "Inferred from hero section or meta description",
  industry: "Inferred from page content and product categories",
  tonePreset: "Analyzed from writing style across website copy",
  audienceType: "Inferred from product positioning and landing page copy",
};

function ConfidenceBadge({
  level,
  reason,
}: {
  level: "high" | "medium" | "suggested";
  reason: string;
}) {
  const config = {
    high: {
      label: "High confidence",
      className: "bg-ai-confidence-high/10 text-ai-confidence-high border-ai-confidence-high/30",
    },
    medium: {
      label: "Medium confidence",
      className: "bg-ai-confidence-medium/10 text-ai-confidence-medium border-ai-confidence-medium/30",
    },
    suggested: {
      label: "Suggested",
      className: "bg-muted text-muted-foreground border-border/50",
    },
  }[level];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("text-xs normal-case tracking-normal cursor-help", config.className)}>
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">{reason}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline-editable field component
function InlineEditableField({
  label,
  value,
  confidence,
  editingField,
  editValue,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  editFieldKey,
}: {
  label: string;
  value: string;
  confidence: { level: "high" | "medium" | "suggested"; reason: string };
  editingField: string | null;
  editValue: string;
  onStartEdit: () => void;
  onChangeEdit: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  editFieldKey: string;
}) {
  const isEditing = editingField === editFieldKey;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <ConfidenceBadge level={confidence.level} reason={confidence.reason} />
        {!isEditing && value && (
          <button
            type="button"
            onClick={onStartEdit}
            className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors min-w-6 min-h-6"
            aria-label={`Edit ${label}`}
            tabIndex={0}
          >
            <PencilSimple className="size-3.5" />
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => onChangeEdit(e.target.value)}
            className="h-8 text-sm flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSaveEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onSaveEdit}>
            <CheckCircle className="size-4 text-success" weight="fill" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onCancelEdit}>
            <ArrowsCounterClockwise className="size-4" />
          </Button>
        </div>
      ) : (
        <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      )}
    </div>
  );
}

// Platform-specific post preview component
function PlatformPostPreview({
  post,
  businessName,
  onRegenerate,
}: {
  post: SamplePost;
  businessName: string;
  onRegenerate?: () => void;
}) {
  const charLimit = PLATFORM_CHAR_LIMITS[post.platform] ?? 0;
  const charCount = post.content.length;
  const charPct = charLimit ? Math.round((charCount / charLimit) * 100) : 0;
  const charColor =
    charPct > 90 ? "text-destructive" : charPct > 75 ? "text-ai-confidence-medium" : "text-muted-foreground";

  if (post.platform === "x") {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
        {/* Tweet-style card */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand font-semibold text-sm">
            {(businessName || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{businessName || "Brand"}</span>
              <span className="text-xs text-muted-foreground">@brand</span>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{post.content}</p>
            <div className="flex items-center gap-4 pt-1 text-muted-foreground">
              <span className="flex items-center gap-1 text-xs">
                <Heart className="size-3.5" /> 0
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Repeat className="size-3.5" /> 0
              </span>
              <span className="flex items-center gap-1 text-xs">
                <ArrowFatUp className="size-3.5" /> 0
              </span>
              <span className="flex items-center gap-1 text-xs">
                <Eye className="size-3.5" /> 0
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className={cn("text-xs font-mono", charColor)}>
            {charCount}/{charLimit} ({charPct}%)
          </span>
          {onRegenerate && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={onRegenerate}>
              <ArrowsCounterClockwise className="size-3" />
              Regenerate
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (post.platform === "linkedin") {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
        {/* LinkedIn card */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand font-semibold text-sm">
            {(businessName || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{businessName || "Brand"}</p>
            <p className="text-xs text-muted-foreground">Sponsored · {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{post.content}</p>
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className={cn("text-xs font-mono", charColor)}>
            {charCount}/{charLimit} chars
          </span>
          {onRegenerate && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={onRegenerate}>
              <ArrowsCounterClockwise className="size-3" />
              Regenerate
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (post.platform === "instagram") {
    return (
      <div className="rounded-lg border border-border/50 bg-card p-4 space-y-3">
        {/* Instagram caption-style */}
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand/60 text-background font-semibold text-xs">
            {(businessName || "?")[0].toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-foreground">{businessName || "brand"}</span>
          <Badge variant="outline" className="text-xs normal-case tracking-normal ml-auto">
            Instagram
          </Badge>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{post.content}</p>
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-3">
            <span className={cn("text-xs font-mono", charColor)}>
              {charCount}/{charLimit}
            </span>
            {charPct > 90 && (
              <Badge variant="outline" className="text-xs normal-case tracking-normal border-destructive/30 text-destructive">
                Near limit
              </Badge>
            )}
          </div>
          {onRegenerate && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={onRegenerate}>
              <ArrowsCounterClockwise className="size-3" />
              Regenerate
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Generic fallback
  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        {PLATFORM_ICONS[post.platform]}
        <Badge variant="outline" className="capitalize text-xs normal-case tracking-normal">
          {post.platform}
        </Badge>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{post.content}</p>
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        {charLimit > 0 && (
          <span className={cn("text-xs font-mono", charColor)}>
            {charCount}/{charLimit}
          </span>
        )}
        {onRegenerate && (
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={onRegenerate}>
            <ArrowsCounterClockwise className="size-3" />
            Regenerate
          </Button>
        )}
      </div>
    </div>
  );
}

export function BrandContextReview({
  draft,
  platforms,
  samples,
  onConfirm,
  onFeedback,
  onEditToggle,
  isStreaming,
  isSaving,
  connectedPlatforms = [],
  accountDetails = {},
}: BrandContextReviewProps) {
  const [feedbackText, setFeedbackText] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    [SECTION_KEYS.identity]: false,
    [SECTION_KEYS.voice]: false,
    [SECTION_KEYS.audience]: false,
    [SECTION_KEYS.goals]: false,
    [SECTION_KEYS.samples]: false,
    [SECTION_KEYS.platforms]: false,
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const businessName = field(draft.businessName);
  const tagline = field(draft.tagline);
  const websiteUrl = field(draft.websiteUrl);
  const industry = field(draft.industry);
  const productDesc = field(draft.productDesc);
  const tonePreset = field(draft.tonePreset);
  const voiceDescription = field(draft.voiceDescription);
  const bannedWords = (draft.bannedWords as string[]) ?? [];
  const audienceType = field(draft.audienceType);
  const interests = (draft.interests as string[]) ?? [];
  const painPoints = (draft.painPoints as string[]) ?? [];
  const competitors = (draft.competitors as string[]) ?? [];
  const goals = (draft.goals as string[]) ?? [];

  const platformEntries = Object.entries(platforms) as [string, PlatformContext][];

  // Collapsible section toggle
  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Inline edit handlers
  function startEdit(fieldKey: string, currentValue: string) {
    setEditingField(fieldKey);
    setEditValues((prev) => ({ ...prev, [fieldKey]: currentValue }));
  }

  function cancelEdit() {
    setEditingField(null);
  }

  function saveEdit() {
    setEditingField(null);
  }

  function handleConfirm() {
    onConfirm(editValues);
  }

  function handleFeedbackSubmit() {
    if (feedbackText.trim()) {
      onFeedback(feedbackText.trim());
      setFeedbackText("");
    }
  }

  // Compute summary values (apply inline edits)
  const effectiveBusinessName = editValues.businessName ?? businessName;
  const effectiveTagline = editValues.tagline ?? tagline;
  const effectiveTone = editValues.tonePreset ?? tonePreset;
  const effectiveAudience = editValues.audienceType ?? audienceType;

  const hasAnyContent = !!(effectiveBusinessName || industry || effectiveTagline || productDesc);

  return (
    <div className="space-y-4 pb-24">
      {/* Quick Summary card */}
      {hasAnyContent && (
        <Card className="border-brand/20 bg-brand/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkle className="size-5 text-brand" weight="fill" />
              Quick Summary
            </CardTitle>
            <CardDescription>
              Key details extracted from your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {effectiveBusinessName && (
                <InlineEditableField
                  label="Brand"
                  value={effectiveBusinessName}
                  confidence={getConfidence(draft, "businessName")}
                  editingField={editingField}
                  editValue={editValues.businessName ?? ""}
                  onStartEdit={() => startEdit("businessName", businessName)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, businessName: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="businessName"
                />
              )}
              {industry && (
                <InlineEditableField
                  label="Industry"
                  value={industry}
                  confidence={getConfidence(draft, "industry")}
                  editingField={editingField}
                  editValue={editValues.industry ?? ""}
                  onStartEdit={() => startEdit("industry", industry)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, industry: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="industry"
                />
              )}
              {effectiveTone && (
                <InlineEditableField
                  label="Tone"
                  value={effectiveTone}
                  confidence={getConfidence(draft, "tonePreset")}
                  editingField={editingField}
                  editValue={editValues.tonePreset ?? ""}
                  onStartEdit={() => startEdit("tonePreset", tonePreset)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, tonePreset: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="tonePreset"
                />
              )}
              {effectiveAudience && (
                <InlineEditableField
                  label="Audience"
                  value={effectiveAudience}
                  confidence={getConfidence(draft, "audienceType")}
                  editingField={editingField}
                  editValue={editValues.audienceType ?? ""}
                  onStartEdit={() => startEdit("audienceType", audienceType)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, audienceType: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="audienceType"
                />
              )}
            </div>
            {(effectiveTagline || productDesc) && (
              <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                {effectiveTagline && (
                  <InlineEditableField
                    label="Tagline"
                    value={effectiveTagline}
                    confidence={getConfidence(draft, "tagline")}
                    editingField={editingField}
                    editValue={editValues.tagline ?? ""}
                    onStartEdit={() => startEdit("tagline", tagline)}
                    onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, tagline: v }))}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    editFieldKey="tagline"
                  />
                )}
                {productDesc && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What You Do
                    </p>
                    <p className="text-sm text-foreground">{productDesc}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Collapsible: Brand Identity details */}
      <Card>
        <button
          type="button"
          onClick={() => toggleSection(SECTION_KEYS.identity)}
          className="w-full text-left"
          aria-expanded={expandedSections[SECTION_KEYS.identity]}
        >
          <CardHeader className="py-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkle className="size-5 text-brand" weight="fill" />
                Brand Identity
              </CardTitle>
              {expandedSections[SECTION_KEYS.identity] ? (
                <CaretDown className="size-5 text-muted-foreground" />
              ) : (
                <CaretRight className="size-5 text-muted-foreground" />
              )}
            </div>
            <CardDescription className="sr-only">
              Full brand identity details
            </CardDescription>
          </CardHeader>
        </button>
        {expandedSections[SECTION_KEYS.identity] && (
          <CardContent className="space-y-4 pt-0">
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              {websiteUrl && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Website
                  </p>
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand hover:underline break-all"
                  >
                    {websiteUrl}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Collapsible: Voice & Tone */}
      {(tonePreset || voiceDescription || bannedWords.length > 0) && (
        <Card>
          <button
            type="button"
            onClick={() => toggleSection(SECTION_KEYS.voice)}
            className="w-full text-left"
            aria-expanded={expandedSections[SECTION_KEYS.voice]}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="size-5 text-brand" weight="fill" />
                  Voice &amp; Tone
                </CardTitle>
                {expandedSections[SECTION_KEYS.voice] ? (
                  <CaretDown className="size-5 text-muted-foreground" />
                ) : (
                  <CaretRight className="size-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="sr-only">
                Voice and tone configuration
              </CardDescription>
            </CardHeader>
          </button>
          {expandedSections[SECTION_KEYS.voice] && (
            <CardContent className="space-y-4 pt-0">
              <Separator />
              <div className="space-y-4">
                {tonePreset && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tone
                    </p>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {tonePreset}
                    </Badge>
                  </div>
                )}
                {voiceDescription && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Voice
                    </p>
                    <p className="text-sm text-foreground">{voiceDescription}</p>
                  </div>
                )}
                {bannedWords.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Banned Words
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {bannedWords.map((w) => (
                        <Badge key={w} variant="destructive" className="text-xs normal-case tracking-normal">
                          {w}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Collapsible: Audience */}
      {(audienceType || interests.length > 0 || painPoints.length > 0) && (
        <Card>
          <button
            type="button"
            onClick={() => toggleSection(SECTION_KEYS.audience)}
            className="w-full text-left"
            aria-expanded={expandedSections[SECTION_KEYS.audience]}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="size-5 text-brand" weight="fill" />
                  Audience
                </CardTitle>
                {expandedSections[SECTION_KEYS.audience] ? (
                  <CaretDown className="size-5 text-muted-foreground" />
                ) : (
                  <CaretRight className="size-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="sr-only">
                Audience details
              </CardDescription>
            </CardHeader>
          </button>
          {expandedSections[SECTION_KEYS.audience] && (
            <CardContent className="space-y-4 pt-0">
              <Separator />
              <div className="space-y-4">
                {interests.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Interests
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {interests.map((i) => (
                        <Badge key={i} variant="secondary" className="text-xs normal-case tracking-normal">
                          {i}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {painPoints.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Pain Points
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {painPoints.map((p) => (
                        <Badge key={p} variant="outline" className="text-xs normal-case tracking-normal">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {competitors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Competitors
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {competitors.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs normal-case tracking-normal">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Collapsible: Goals */}
      {goals.length > 0 && (
        <Card>
          <button
            type="button"
            onClick={() => toggleSection(SECTION_KEYS.goals)}
            className="w-full text-left"
            aria-expanded={expandedSections[SECTION_KEYS.goals]}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="size-5 text-brand" weight="fill" />
                  Goals
                </CardTitle>
                {expandedSections[SECTION_KEYS.goals] ? (
                  <CaretDown className="size-5 text-muted-foreground" />
                ) : (
                  <CaretRight className="size-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="sr-only">
                Business goals
              </CardDescription>
            </CardHeader>
          </button>
          {expandedSections[SECTION_KEYS.goals] && (
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5">
                {goals.map((g) => (
                  <Badge key={g} variant="outline" className="text-xs normal-case tracking-normal">
                    {g.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Collapsible: Sample Posts with platform previews */}
      {samples.length > 0 && (
        <Card>
          <button
            type="button"
            onClick={() => toggleSection(SECTION_KEYS.samples)}
            className="w-full text-left"
            aria-expanded={expandedSections[SECTION_KEYS.samples]}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ChatCircle className="size-5 text-brand" weight="fill" />
                  Sample Posts
                  <Badge variant="secondary" className="text-xs normal-case tracking-normal ml-1">
                    {samples.length}
                  </Badge>
                </CardTitle>
                {expandedSections[SECTION_KEYS.samples] ? (
                  <CaretDown className="size-5 text-muted-foreground" />
                ) : (
                  <CaretRight className="size-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="sr-only">
                Platform-specific post previews
              </CardDescription>
            </CardHeader>
          </button>
          {expandedSections[SECTION_KEYS.samples] && (
            <CardContent className="space-y-3 pt-0">
              <Separator />
              {samples.map((post, i) => (
                <PlatformPostPreview
                  key={i}
                  post={post}
                  businessName={effectiveBusinessName}
                />
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Collapsible: Platform Contexts */}
      {platformEntries.length > 0 && (
        <Card>
          <button
            type="button"
            onClick={() => toggleSection(SECTION_KEYS.platforms)}
            className="w-full text-left"
            aria-expanded={expandedSections[SECTION_KEYS.platforms]}
          >
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="size-5 text-brand" weight="fill" />
                  Platform Contexts
                </CardTitle>
                {expandedSections[SECTION_KEYS.platforms] ? (
                  <CaretDown className="size-5 text-muted-foreground" />
                ) : (
                  <CaretRight className="size-5 text-muted-foreground" />
                )}
              </div>
              <CardDescription className="sr-only">
                AI-generated defaults for each connected platform
              </CardDescription>
            </CardHeader>
          </button>
          {expandedSections[SECTION_KEYS.platforms] && (
            <CardContent className="pt-0">
              <Separator className="mb-3" />
              <Accordion type="single" collapsible className="w-full">
                {platformEntries.map(([platform, pc]) => {
                  const isConnected = connectedPlatforms.includes(platform);
                  const details = accountDetails[platform];
                  return (
                    <AccordionItem key={platform} value={platform}>
                      <AccordionTrigger className="text-sm font-medium capitalize">
                        <span className="flex items-center gap-2">
                          {platform}
                          {isConnected && (
                            <Badge variant="secondary" className="text-xs normal-case tracking-normal flex items-center gap-1">
                              <CheckCircle className="size-3 text-success" weight="fill" />
                              Connected
                              {details?.platformUsername && (
                                <span className="text-muted-foreground">· {details.platformUsername}</span>
                              )}
                              {details?.followerCount != null && (
                                <span className="text-muted-foreground">· {(details.followerCount / 1000).toFixed(1)}k followers</span>
                              )}
                            </Badge>
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-3 sm:grid-cols-2 text-sm">
                          {pc.platformTone && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Tone
                              </p>
                              <Badge variant="outline" className="normal-case tracking-normal">
                                {pc.platformTone as string}
                              </Badge>
                            </div>
                          )}
                          {pc.postingCadence && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Cadence
                              </p>
                              <p className="text-foreground">{pc.postingCadence as string}</p>
                            </div>
                          )}
                          {pc.visualStyle && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Visual Style
                              </p>
                              <p className="text-foreground">{pc.visualStyle as string}</p>
                            </div>
                          )}
                          {pc.engagementStyle && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Engagement
                              </p>
                              <p className="text-foreground">{pc.engagementStyle as string}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          )}
        </Card>
      )}

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-3xl px-4 py-3 space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleConfirm}
              disabled={isStreaming || isSaving}
              className="min-h-10"
            >
              {isSaving ? (
                <>
                  <Spinner className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="size-4" weight="fill" />
                  Looks right — save
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onEditToggle}
              disabled={isStreaming || isSaving}
              className="min-h-10"
            >
              <PencilSimple className="size-4" />
              Edit something
            </Button>
          </div>

          <div className="flex gap-2">
            <Textarea
              placeholder="Or tell me what to change... e.g. &quot;make it more casual on Instagram&quot;"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={isStreaming || isSaving}
              className="min-h-10 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleFeedbackSubmit();
                }
              }}
            />
            <Button
              onClick={handleFeedbackSubmit}
              disabled={isStreaming || isSaving || !feedbackText.trim()}
              variant="outline"
              className="min-h-10 self-end shrink-0"
            >
              {isStreaming ? (
                <Spinner className="size-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
