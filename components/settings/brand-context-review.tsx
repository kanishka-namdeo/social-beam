"use client";

import { useState, useCallback, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Question,
  Plus,
  X,
  Eye as EyeIcon,
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

export type ReviewStep = "review" | "changes" | "finalConfirm" | "saving";

interface BrandContextReviewProps {
  draft: Record<string, unknown>;
  platforms: Record<string, unknown>;
  samples: SamplePost[];
  onConfirm: (edits: Record<string, unknown>) => void;
  onFeedback: (text: string) => void;
  onEditToggle?: () => void;
  isStreaming: boolean;
  isSaving: boolean;
  connectedPlatforms?: string[];
  accountDetails?: Record<string, { platformUsername?: string; followerCount?: number }>;
  initialStep?: ReviewStep;
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

const TONE_OPTIONS = ["professional", "casual", "witty", "educational", "inspirational", "bold"];
const AUDIENCE_OPTIONS = ["b2b", "b2c", "both"];
const GOAL_OPTIONS = ["awareness", "leads", "sales", "community", "thought_leadership"];

const HUMAN_READABLE_FIELD_NAMES: Record<string, string> = {
  businessName: "Brand Name",
  tagline: "Tagline",
  industry: "Industry",
  productDesc: "Description",
  tonePreset: "Tone",
  voiceDescription: "Voice",
  bannedWords: "Banned Words",
  audienceType: "Audience Type",
  interests: "Interests",
  painPoints: "Pain Points",
  competitors: "Competitors",
  goals: "Goals",
};

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
  isChangesMode,
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
  isChangesMode?: boolean;
}) {
  const isEditing = editingField === editFieldKey;

  return (
    <div className={cn("space-y-1", isChangesMode && "p-2 rounded border border-dashed border-muted")}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
          {label}
        </p>
        <ConfidenceBadge level={confidence.level} reason={confidence.reason} />
        {!isEditing && (
          <button
            type="button"
            onClick={onStartEdit}
            className={cn(
              "ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors min-w-6 min-h-6",
              isChangesMode && "text-brand",
            )}
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

// Inline-editable textarea for long-form fields
function InlineEditableTextarea({
  label,
  value,
  editingField,
  editValue,
  onStartEdit,
  onChangeEdit,
  onSaveEdit,
  onCancelEdit,
  editFieldKey,
  isChangesMode,
}: {
  label: string;
  value: string;
  editingField: string | null;
  editValue: string;
  onStartEdit: () => void;
  onChangeEdit: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  editFieldKey: string;
  isChangesMode?: boolean;
}) {
  const isEditing = editingField === editFieldKey;

  return (
    <div className={cn("space-y-1", isChangesMode && "p-2 rounded border border-dashed border-muted")}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
          {label}
        </p>
        {!isEditing && value && (
          <button
            type="button"
            onClick={onStartEdit}
            className={cn(
              "ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors min-w-6 min-h-6",
              isChangesMode && "text-brand",
            )}
            aria-label={`Edit ${label}`}
          >
            <PencilSimple className="size-3.5" />
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => onChangeEdit(e.target.value)}
            className="text-sm resize-none"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                e.preventDefault();
                onSaveEdit();
              }
              if (e.key === "Escape") onCancelEdit();
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onSaveEdit}>
              <CheckCircle className="size-3 text-success" weight="fill" />
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={onCancelEdit}>
              <ArrowsCounterClockwise className="size-3" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground">{value || <span className="text-muted-foreground italic">Not set</span>}</p>
      )}
    </div>
  );
}

// Inline-editable tags for array fields
function InlineEditableTags({
  label,
  tags,
  editingField,
  editTags,
  onAddTag,
  onRemoveTag,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  editFieldKey,
  isChangesMode,
}: {
  label: string;
  tags: string[];
  editingField: string | null;
  editTags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  editFieldKey: string;
  isChangesMode?: boolean;
}) {
  const isEditing = editingField === editFieldKey;
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !editTags.includes(trimmed)) {
      onAddTag(trimmed);
      setTagInput("");
    }
  };

  return (
    <div className={cn("space-y-2", isChangesMode && "p-2 rounded border border-dashed border-muted")}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
          {label}
        </p>
        {!isEditing && (
          <button
            type="button"
            onClick={onStartEdit}
            className={cn(
              "ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors min-w-6 min-h-6",
              isChangesMode && "text-brand",
            )}
            aria-label={`Edit ${label}`}
          >
            <PencilSimple className="size-3.5" />
          </button>
        )}
        {isEditing && (
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onSaveEdit();
                setTagInput("");
              }}
              className="text-xs text-brand hover:text-brand/80 font-medium"
            >
              Done
            </button>
          </div>
        )}
      </div>
      {isEditing && (
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag and press Enter"
            className="h-8 text-sm flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <Button type="button" size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleAddTag} disabled={!tagInput.trim()}>
            <Plus className="size-3.5" />
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {editTags.length > 0 ? (
          editTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs normal-case tracking-normal">
              {tag}
              {isEditing && (
                <button
                  onClick={() => onRemoveTag(tag)}
                  className="ml-0.5 hover:text-destructive"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="size-3" />
                </button>
              )}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground italic">None set</span>
        )}
      </div>
    </div>
  );
}

// Inline-editable goals with toggleable badges
function InlineEditableGoals({
  goals,
  editingField,
  editGoals,
  onToggleGoal,
  editFieldKey,
  isChangesMode,
}: {
  goals: string[];
  editingField: string | null;
  editGoals: string[];
  onToggleGoal: (goal: string) => void;
  editFieldKey: string;
  isChangesMode?: boolean;
}) {
  return (
    <div className={cn("space-y-1", isChangesMode && "p-2 rounded border border-dashed border-muted")}>
      <div className="flex items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
          Goals
        </p>
        {editingField === editFieldKey && (
          <Badge variant="outline" className="text-xs normal-case tracking-normal">
            Click to toggle
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GOAL_OPTIONS.map((goal) => {
          const isSelected = editGoals.includes(goal);
          return (
            <Badge
              key={goal}
              variant={isSelected ? "default" : "outline"}
              className={cn(
                "cursor-pointer text-xs normal-case tracking-normal min-h-7 flex items-center gap-1.5 px-3",
                isSelected && "bg-success/10 text-success border-success/20",
              )}
              onClick={() => onToggleGoal(goal)}
            >
              {isSelected && <CheckCircle className="size-3" weight="fill" />}
              {goal.replace(/_/g, " ")}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

// Compute which fields have been edited
function computeChangedFields(
  draft: Record<string, unknown>,
  editValues: Record<string, unknown>
): string[] {
  const changes: string[] = [];
  for (const [key, editVal] of Object.entries(editValues)) {
    if (key === "platforms" || key === "_confidence" || key === "samplePosts") continue;
    const original = draft[key];
    if (editVal === undefined || editVal === null) continue;
    if (typeof editVal === "string" && editVal !== original && String(original ?? "").trim() !== editVal.trim()) {
      changes.push(key);
    } else if (Array.isArray(editVal) && JSON.stringify(editVal) !== JSON.stringify(original ?? [])) {
      changes.push(key);
    }
  }
  return changes;
}

// Platform-specific post preview component
function PlatformPostPreview({
  post,
  postIndex,
  businessName,
  onRegenerate,
  isEditable,
  onEditPost,
}: {
  post: SamplePost;
  postIndex: number;
  businessName: string;
  onRegenerate?: () => void;
  isEditable?: boolean;
  onEditPost?: (index: number, content: string) => void;
}) {
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [postEditContent, setPostEditContent] = useState(post.content);
  const charLimit = PLATFORM_CHAR_LIMITS[post.platform] ?? 0;
  const displayContent = isEditingPost ? postEditContent : post.content;
  const charCount = displayContent.length;
  const charPct = charLimit ? Math.round((charCount / charLimit) * 100) : 0;
  const charColor =
    charPct > 90 ? "text-destructive" : charPct > 75 ? "text-ai-confidence-medium" : "text-muted-foreground";

  const handleSavePost = () => {
    onEditPost?.(postIndex, postEditContent);
    setIsEditingPost(false);
  };

  const handleCancelPost = () => {
    setPostEditContent(post.content);
    setIsEditingPost(false);
  };

  if (post.platform === "x") {
    return (
      <Card className={cn("rounded-sm border-border/50 bg-card p-4 space-y-3", isEditingPost && "ring-1 ring-brand/30")}>
        {/* Tweet-style card */}
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-brand/10 text-brand font-semibold text-sm">
            {(businessName || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{businessName || "Brand"}</span>
              <span className="text-xs text-muted-foreground">@brand</span>
              {isEditable && !isEditingPost && (
                <button
                  onClick={() => setIsEditingPost(true)}
                  className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  aria-label="Edit post"
                >
                  <PencilSimple className="size-3.5" />
                </button>
              )}
            </div>
            {isEditingPost ? (
              <div className="space-y-2">
                <Textarea
                  value={postEditContent}
                  onChange={(e) => setPostEditContent(e.target.value)}
                  className="text-sm resize-none"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSavePost(); }
                    if (e.key === "Escape") handleCancelPost();
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleSavePost}>
                    <CheckCircle className="size-3 text-success" weight="fill" />
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCancelPost}>
                    <ArrowsCounterClockwise className="size-3" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap break-words">{displayContent}</p>
            )}
            {!isEditingPost && (
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
            )}
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className={cn("text-xs font-mono", charColor)}>
            {charCount}/{charLimit} ({charPct}%)
          </span>
          {!isEditingPost && onRegenerate && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={onRegenerate}>
              <ArrowsCounterClockwise className="size-3" />
              Regenerate
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (post.platform === "linkedin") {
    return (
      <div className={cn("rounded-sm border border-border/50 bg-card p-4 space-y-3", isEditingPost && "ring-1 ring-brand/30")}>
        {/* LinkedIn card */}
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-brand/10 text-brand font-semibold text-sm">
            {(businessName || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{businessName || "Brand"}</p>
              {isEditable && !isEditingPost && (
                <button
                  onClick={() => setIsEditingPost(true)}
                  className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                  aria-label="Edit post"
                >
                  <PencilSimple className="size-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Sponsored · {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        {isEditingPost ? (
          <div className="space-y-2">
            <Textarea
              value={postEditContent}
              onChange={(e) => setPostEditContent(e.target.value)}
              className="text-sm resize-none"
              rows={4}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSavePost(); }
                if (e.key === "Escape") handleCancelPost();
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleSavePost}>
                <CheckCircle className="size-3 text-success" weight="fill" />
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCancelPost}>
                <ArrowsCounterClockwise className="size-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{displayContent}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <span className={cn("text-xs font-mono", charColor)}>
            {charCount}/{charLimit} chars
          </span>
          {!isEditingPost && onRegenerate && (
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
      <div className={cn("rounded-sm border border-border/50 bg-card p-4 space-y-3", isEditingPost && "ring-1 ring-brand/30")}>
        {/* Instagram caption-style */}
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-gradient-to-br from-brand to-brand/60 text-background font-semibold text-xs">
            {(businessName || "?")[0].toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-foreground">{businessName || "brand"}</span>
          <Badge variant="outline" className="text-xs normal-case tracking-normal ml-auto">
            Instagram
          </Badge>
          {isEditable && !isEditingPost && (
            <button
              onClick={() => setIsEditingPost(true)}
              className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
              aria-label="Edit post"
            >
              <PencilSimple className="size-3.5" />
            </button>
          )}
        </div>
        {isEditingPost ? (
          <div className="space-y-2">
            <Textarea
              value={postEditContent}
              onChange={(e) => setPostEditContent(e.target.value)}
              className="text-sm resize-none"
              rows={4}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSavePost(); }
                if (e.key === "Escape") handleCancelPost();
              }}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleSavePost}>
                <CheckCircle className="size-3 text-success" weight="fill" />
                Save
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCancelPost}>
                <ArrowsCounterClockwise className="size-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground whitespace-pre-wrap break-words">{displayContent}</p>
        )}
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
          {!isEditingPost && onRegenerate && (
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
    <div className={cn("rounded-sm border border-border/50 bg-muted/30 p-4 space-y-3", isEditingPost && "ring-1 ring-brand/30")}>
      <div className="flex items-center gap-2">
        {PLATFORM_ICONS[post.platform]}
        <Badge variant="outline" className="capitalize text-xs normal-case tracking-normal">
          {post.platform}
        </Badge>
        {isEditable && !isEditingPost && (
          <button
            onClick={() => setIsEditingPost(true)}
            className="ml-auto flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            aria-label="Edit post"
          >
            <PencilSimple className="size-3.5" />
          </button>
        )}
      </div>
      {isEditingPost ? (
        <div className="space-y-2">
          <Textarea
            value={postEditContent}
            onChange={(e) => setPostEditContent(e.target.value)}
            className="text-sm resize-none"
            rows={4}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) { e.preventDefault(); handleSavePost(); }
              if (e.key === "Escape") handleCancelPost();
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleSavePost}>
              <CheckCircle className="size-3 text-success" weight="fill" />
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleCancelPost}>
              <ArrowsCounterClockwise className="size-3" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{displayContent}</p>
      )}
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
  const [step, setStep] = useState<ReviewStep>("review");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    [SECTION_KEYS.identity]: false,
    [SECTION_KEYS.voice]: false,
    [SECTION_KEYS.audience]: false,
    [SECTION_KEYS.goals]: false,
    [SECTION_KEYS.samples]: true,
    [SECTION_KEYS.platforms]: false,
  });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  // Initialize step from props if provided
  // Track edited sample posts separately: Record<index, content>
  const [editedPosts, setEditedPosts] = useState<Record<number, string>>({});

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

  // Changed fields detection
  const changedFields = useMemo(
    () => computeChangedFields(draft, editValues),
    [draft, editValues],
  );

  // Collapsible section toggle
  function toggleSection(key: string) {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Step navigation
  const goToStep = useCallback((s: ReviewStep) => {
    setStep(s);
    if (s === "review") {
      // Reset edits when returning to review
      setEditValues({});
      setEditedPosts({});
      setEditingField(null);
    }
  }, []);

  const handleLooksRight = useCallback(() => goToStep("finalConfirm"), [goToStep]);
  const handleMakeChanges = useCallback(() => goToStep("changes"), [goToStep]);
  const handleDoneEditing = useCallback(() => goToStep("finalConfirm"), [goToStep]);
  const handleGoBackToEdit = useCallback(() => goToStep("changes"), [goToStep]);

  // Inline edit handlers
  function startEdit(fieldKey: string, currentValue: unknown) {
    setEditingField(fieldKey);
    if (editValues[fieldKey] === undefined) {
      setEditValues((prev) => ({ ...prev, [fieldKey]: currentValue }));
    }
  }

  function cancelEdit() {
    setEditingField(null);
  }

  function saveEdit() {
    setEditingField(null);
  }

  function handleConfirm() {
    const allEdits: Record<string, unknown> = { ...editValues };
    // Include edited posts if any
    const editedSamples = Object.entries(editedPosts);
    if (editedSamples.length > 0) {
      const newSamples = samples.map((s, i) => {
        if (editedPosts[i] !== undefined) return { ...s, content: editedPosts[i] };
        return s;
      });
      allEdits.samplePosts = newSamples;
    }
    onConfirm(allEdits);
  }

  function handleFeedbackSubmit() {
    if (feedbackText.trim()) {
      onFeedback(feedbackText.trim());
      setFeedbackText("");
    }
  }

  function handleRegenerateSample(platform: string) {
    setFeedbackText(`Regenerate the ${platform} post with a different angle`);
    const feedbackInput = document.getElementById("feedback-input");
    feedbackInput?.focus();
    feedbackInput?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  // Edit handlers for array fields
  function addToArrayField(fieldKey: string, value: string) {
    const current = (editValues[fieldKey] as string[]) ?? (draft[fieldKey] as string[]) ?? [];
    setEditValues((prev) => ({ ...prev, [fieldKey]: [...current, value] }));
  }

  function removeFromArrayField(fieldKey: string, value: string) {
    const current = (editValues[fieldKey] as string[]) ?? (draft[fieldKey] as string[]) ?? [];
    setEditValues((prev) => ({ ...prev, [fieldKey]: current.filter((t) => t !== value) }));
  }

  function toggleGoalField(goal: string) {
    const currentGoals = (editValues.goals as string[]) ?? goals ?? [];
    const next = currentGoals.includes(goal)
      ? currentGoals.filter((g: string) => g !== goal)
      : [...currentGoals, goal];
    setEditValues((prev) => ({ ...prev, goals: next }));
  }

  function handleEditPost(index: number, content: string) {
    setEditedPosts((prev) => ({ ...prev, [index]: content }));
  }

  // Compute summary values (apply inline edits)
  const effectiveBusinessName = (editValues.businessName as string) ?? businessName;
  const effectiveTagline = (editValues.tagline as string) ?? tagline;
  const effectiveTone = (editValues.tonePreset as string) ?? tonePreset;
  const effectiveAudience = (editValues.audienceType as string) ?? audienceType;
  const effectiveProductDesc = (editValues.productDesc as string) ?? productDesc;
  const effectiveVoiceDescription = (editValues.voiceDescription as string) ?? voiceDescription;
  const effectiveInterests = (editValues.interests as string[]) ?? interests;
  const effectivePainPoints = (editValues.painPoints as string[]) ?? painPoints;
  const effectiveCompetitors = (editValues.competitors as string[]) ?? competitors;
  const effectiveGoals = (editValues.goals as string[]) ?? goals;
  const effectiveBannedWords = (editValues.bannedWords as string[]) ?? bannedWords;
  const effectiveIndustry = (editValues.industry as string) ?? industry;

  const hasAnyContent = !!(effectiveBusinessName || effectiveIndustry || effectiveTagline || effectiveProductDesc);
  const isChangesMode = step === "changes";
  const isFinalConfirm = step === "finalConfirm";

  return (
    <div className={cn("space-y-4", isFinalConfirm ? "pb-24" : "pb-24")}>
      {/* Step indicator bar */}
      {step !== "saving" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {(["review", "changes", "finalConfirm"] as const).map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center justify-center size-6 rounded-full text-xs font-semibold transition-colors",
                  step === s && "bg-brand text-white",
                  (step === "changes" && s === "review") || (step === "finalConfirm" && s !== "finalConfirm")
                    ? "bg-success text-white"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {step === "finalConfirm" || (step === "changes" && s !== "changes") ? (
                  <CheckCircle className="size-3.5" weight="fill" />
                ) : (
                  i + 1
                )}
              </span>
              <span className={cn(step === s && "text-foreground font-medium")}>
                {s === "review" ? "Review" : s === "changes" ? "Edit" : "Confirm"}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Changes made indicator */}
      {isChangesMode && changedFields.length > 0 && (
        <Card className="border-brand/30 bg-brand/5">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <PencilSimple className="size-4 text-brand" weight="fill" />
              <span className="font-medium text-foreground">
                {changedFields.length} field{changedFields.length !== 1 ? "s" : ""} edited
              </span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help underline decoration-dotted">
                      ({changedFields.map((k) => HUMAN_READABLE_FIELD_NAMES[k] ?? k).join(", ")})
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">These fields differ from the original AI analysis</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Summary card */}
      {hasAnyContent && (
        <Card className={cn("border-brand/20 bg-brand/5", isFinalConfirm && "border-2")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkle className="size-5 text-brand" weight="fill" />
              Quick Summary
              {isFinalConfirm && <Badge variant="outline" className="text-xs normal-case tracking-normal">Final review</Badge>}
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
                  editValue={(editValues.businessName as string) ?? ""}
                  onStartEdit={() => startEdit("businessName", draft.businessName)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, businessName: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="businessName"
                  isChangesMode={isChangesMode}
                />
              )}
              {effectiveIndustry && (
                <InlineEditableField
                  label="Industry"
                  value={effectiveIndustry}
                  confidence={getConfidence(draft, "industry")}
                  editingField={editingField}
                  editValue={(editValues.industry as string) ?? ""}
                  onStartEdit={() => startEdit("industry", draft.industry)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, industry: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="industry"
                  isChangesMode={isChangesMode}
                />
              )}
              {effectiveTone && (
                <InlineEditableField
                  label="Tone"
                  value={effectiveTone}
                  confidence={getConfidence(draft, "tonePreset")}
                  editingField={editingField}
                  editValue={(editValues.tonePreset as string) ?? ""}
                  onStartEdit={() => startEdit("tonePreset", draft.tonePreset)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, tonePreset: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="tonePreset"
                  isChangesMode={isChangesMode}
                />
              )}
              {effectiveAudience && (
                <InlineEditableField
                  label="Audience"
                  value={effectiveAudience}
                  confidence={getConfidence(draft, "audienceType")}
                  editingField={editingField}
                  editValue={(editValues.audienceType as string) ?? ""}
                  onStartEdit={() => startEdit("audienceType", draft.audienceType)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, audienceType: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="audienceType"
                  isChangesMode={isChangesMode}
                />
              )}
            </div>
            {(effectiveTagline || effectiveProductDesc) && (
              <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
                {effectiveTagline && (
                  <InlineEditableField
                    label="Tagline"
                    value={effectiveTagline}
                    confidence={getConfidence(draft, "tagline")}
                    editingField={editingField}
                    editValue={(editValues.tagline as string) ?? ""}
                    onStartEdit={() => startEdit("tagline", draft.tagline)}
                    onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, tagline: v }))}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    editFieldKey="tagline"
                    isChangesMode={isChangesMode}
                  />
                )}
                <InlineEditableTextarea
                  label="What You Do"
                  value={effectiveProductDesc}
                  editingField={editingField}
                  editValue={(editValues.productDesc as string) ?? ""}
                  onStartEdit={() => startEdit("productDesc", draft.productDesc)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, productDesc: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="productDesc"
                  isChangesMode={isChangesMode}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How was this extracted? — explainability on demand */}
      <Card className="border-border/50">
        <Accordion type="single" collapsible>
          <AccordionItem value="explainability" className="border-0">
            <AccordionTrigger className="px-5 py-3 text-sm font-medium text-muted-foreground hover:no-underline">
              <div className="flex items-center gap-2">
                <Question className="size-4" />
                How was this extracted?
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-4">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  I analyzed your website by crawling publicly accessible pages and running the content through an AI model trained to identify brand patterns.
                </p>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">What I looked at:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong className="text-foreground">Hero section</strong> — tagline, value proposition, primary messaging</li>
                    <li><strong className="text-foreground">About / Mission pages</strong> — brand story, target audience, industry positioning</li>
                    <li><strong className="text-foreground">Blog / Content</strong> — writing style, tone, vocabulary patterns</li>
                    <li><strong className="text-foreground">Product pages</strong> — what you sell, who you serve, pricing signals</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Confidence levels:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><span className="text-ai-confidence-high font-medium">High confidence</span> — extracted from explicit page content (e.g., business name from meta tags)</li>
                    <li><span className="text-ai-confidence-medium font-medium">Medium confidence</span> — inferred from context and patterns (e.g., tone from writing style)</li>
                    <li><span className="text-muted-foreground font-medium">Suggested</span> — AI-generated default based on industry norms</li>
                  </ul>
                </div>
                <p className="text-xs">
                  You can edit any field directly, or use the refine box below to request changes in natural language.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

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
                  <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
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
      {(effectiveTone || effectiveVoiceDescription || effectiveBannedWords.length > 0) && (
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                      Tone
                    </p>
                    {isChangesMode ? (
                      <Select
                        value={(editValues.tonePreset as string) ?? tonePreset}
                        onValueChange={(v) => setEditValues((prev) => ({ ...prev, tonePreset: v }))}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className="normal-case tracking-normal">
                        {effectiveTone}
                      </Badge>
                    )}
                  </div>
                </div>
                <InlineEditableTextarea
                  label="Voice"
                  value={effectiveVoiceDescription}
                  editingField={editingField}
                  editValue={(editValues.voiceDescription as string) ?? ""}
                  onStartEdit={() => startEdit("voiceDescription", draft.voiceDescription)}
                  onChangeEdit={(v) => setEditValues((prev) => ({ ...prev, voiceDescription: v }))}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="voiceDescription"
                  isChangesMode={isChangesMode}
                />
                <InlineEditableTags
                  label="Banned Words"
                  tags={effectiveBannedWords}
                  editingField={editingField}
                  editTags={effectiveBannedWords}
                  onAddTag={(tag) => addToArrayField("bannedWords", tag)}
                  onRemoveTag={(tag) => removeFromArrayField("bannedWords", tag)}
                  onStartEdit={() => startEdit("bannedWords", draft.bannedWords)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="bannedWords"
                  isChangesMode={isChangesMode}
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Collapsible: Audience */}
      {(effectiveAudience || effectiveInterests.length > 0 || effectivePainPoints.length > 0) && (
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
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                    Audience Type
                  </p>
                  {isChangesMode ? (
                    <Select
                      value={(editValues.audienceType as string) ?? audienceType}
                      onValueChange={(v) => setEditValues((prev) => ({ ...prev, audienceType: v }))}
                    >
                      <SelectTrigger className="h-8 text-sm w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_OPTIONS.map((a) => (
                          <SelectItem key={a} value={a}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="secondary" className="normal-case tracking-normal">
                      {effectiveAudience}
                    </Badge>
                  )}
                </div>
                <InlineEditableTags
                  label="Interests"
                  tags={effectiveInterests}
                  editingField={editingField}
                  editTags={effectiveInterests}
                  onAddTag={(tag) => addToArrayField("interests", tag)}
                  onRemoveTag={(tag) => removeFromArrayField("interests", tag)}
                  onStartEdit={() => startEdit("interests", draft.interests)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="interests"
                  isChangesMode={isChangesMode}
                />
                <InlineEditableTags
                  label="Pain Points"
                  tags={effectivePainPoints}
                  editingField={editingField}
                  editTags={effectivePainPoints}
                  onAddTag={(tag) => addToArrayField("painPoints", tag)}
                  onRemoveTag={(tag) => removeFromArrayField("painPoints", tag)}
                  onStartEdit={() => startEdit("painPoints", draft.painPoints)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="painPoints"
                  isChangesMode={isChangesMode}
                />
                <InlineEditableTags
                  label="Competitors"
                  tags={effectiveCompetitors}
                  editingField={editingField}
                  editTags={effectiveCompetitors}
                  onAddTag={(tag) => addToArrayField("competitors", tag)}
                  onRemoveTag={(tag) => removeFromArrayField("competitors", tag)}
                  onStartEdit={() => startEdit("competitors", draft.competitors)}
                  onSaveEdit={saveEdit}
                  onCancelEdit={cancelEdit}
                  editFieldKey="competitors"
                  isChangesMode={isChangesMode}
                />
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Collapsible: Goals */}
      {effectiveGoals.length > 0 && (
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
              <InlineEditableGoals
                goals={effectiveGoals}
                editingField={editingField}
                editGoals={effectiveGoals}
                onToggleGoal={toggleGoalField}
                editFieldKey="goals"
                isChangesMode={isChangesMode}
              />
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
                  postIndex={i}
                  businessName={effectiveBusinessName}
                  onRegenerate={() => handleRegenerateSample(post.platform)}
                  isEditable={isChangesMode}
                  onEditPost={handleEditPost}
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
                              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                                Tone
                              </p>
                              <Badge variant="outline" className="normal-case tracking-normal">
                                {pc.platformTone as string}
                              </Badge>
                            </div>
                          )}
                          {pc.postingCadence && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                                Cadence
                              </p>
                              <p className="text-foreground">{pc.postingCadence as string}</p>
                            </div>
                          )}
                          {pc.visualStyle && (
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                                Visual Style
                              </p>
                              <p className="text-foreground">{pc.visualStyle as string}</p>
                            </div>
                          )}
                          {pc.engagementStyle && (
                            <div className="space-y-1 sm:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
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
          {/* Review step: "Looks right" + "Make Changes" */}
          {step === "review" && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleLooksRight} disabled={isStreaming || isSaving} className="min-h-10">
                <CheckCircle className="size-4 mr-1" weight="fill" />
                Looks right
              </Button>
              <Button variant="outline" onClick={handleMakeChanges} disabled={isStreaming || isSaving} className="min-h-10">
                <PencilSimple className="size-4 mr-1" />
                Make Changes
              </Button>
            </div>
          )}

          {/* Changes step: "Done Editing" + "Cancel" */}
          {step === "changes" && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleDoneEditing} disabled={isStreaming || isSaving} className="min-h-10">
                <CheckCircle className="size-4 mr-1" weight="fill" />
                Done Editing
              </Button>
              <Button variant="outline" onClick={() => goToStep("review")} disabled={isStreaming || isSaving} className="min-h-10">
                <ArrowsCounterClockwise className="size-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}

          {/* Final Confirm step: "Save & Apply" + "Go Back" */}
          {isFinalConfirm && (
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleConfirm} disabled={isStreaming || isSaving} className="min-h-10">
                {isSaving ? (
                  <>
                    <Spinner className="size-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="size-4 mr-1" weight="fill" />
                    Save &amp; Apply
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleGoBackToEdit} disabled={isStreaming || isSaving} className="min-h-10">
                <PencilSimple className="size-4 mr-1" />
                Go Back
              </Button>
            </div>
          )}

          {/* Refine feedback — always available */}
          {step !== "saving" && (
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Label htmlFor="feedback-input" className="text-xs text-muted-foreground">
                  Refine with natural language
                </Label>
                <Textarea
                  id="feedback-input"
                  placeholder='e.g., "make it more casual on Instagram", "use fewer hashtags", "sound more professional"'
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
              </div>
              <Button
                onClick={handleFeedbackSubmit}
                disabled={isStreaming || isSaving || !feedbackText.trim()}
                variant="outline"
                className="min-h-10 self-end shrink-0 mt-5"
                aria-label="Send feedback to refine brand context"
              >
                {isStreaming ? (
                  <>
                    <Spinner className="size-4 animate-spin mr-1" />
                    <span className="text-xs">Refining...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="size-4 mr-1" />
                    <span className="text-xs">Refine</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
