"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Image,
  Keyboard,
  PencilSimple,
  Sparkle,
  Spinner,
  TextT,
  X,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { cn } from "@/lib/utils";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";
import {
  platformIcon,
  platformIconSm,
  PLATFORM_DISPLAY_NAMES,
} from "@/lib/oauth/platform-icons";
import { PreviewPanel } from "./preview/preview-panel";
import { RichTextEditor } from "./rich-text-editor";
import { AiComposePanel } from "./ai-compose-panel";
import { MediaPicker } from "@/components/media/media-picker";

interface ConnectedAccount {
  platform: string;
  platformUsername: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
}

interface MediaAsset {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  publicUrl: string;
  status: string;
  tags: string[];
  createdAt: Date;
}

interface ComposeFormProps {
  connectedAccounts: ConnectedAccount[];
  initialPrompt?: string;
}

function getActiveLimit(
  selectedPlatforms: string[],
): number | null {
  if (selectedPlatforms.length === 0) return null;
  const limits = selectedPlatforms
    .map((p) => PLATFORM_CHAR_LIMITS[p])
    .filter((n) => n != null);
  if (limits.length === 0) return null;
  return Math.min(...limits);
}

function getCounterState(
  textLength: number,
  limit: number | null,
): "normal" | "warning" | "error" | "none" {
  if (limit == null) return "none";
  const threshold = Math.floor(limit * 0.9);
  if (textLength > limit) return "error";
  if (textLength >= threshold) return "warning";
  return "normal";
}

const COUNTER_COLOR: Record<string, string> = {
  normal: "text-compose-counter-normal",
  warning: "text-compose-counter-warning",
  error: "text-compose-counter-error",
  none: "text-muted-foreground",
};

export function ComposeForm({ connectedAccounts, initialPrompt }: ComposeFormProps) {
  const connectedPlatforms = connectedAccounts.map((a) => a.platform);
  const [title, setTitle] = useState(initialPrompt ? initialPrompt.slice(0, 80) : "");
  const [contentHtml, setContentHtml] = useState(initialPrompt ? `<p>${initialPrompt}</p>` : "");
  const [contentText, setContentText] = useState(initialPrompt ?? "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "ai">("manual");
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // Unsaved changes tracking
  const [isDirty, setIsDirty] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"clear" | null>(null);
  const initialTitle = initialPrompt ? initialPrompt.slice(0, 80) : "";
  const initialContentText = initialPrompt ?? "";

  const isDirtyComputed =
    isDirty ||
    title.trim().length > 0 ||
    contentText.trim().length > 0 ||
    title !== initialTitle ||
    contentText !== initialContentText;

  const activeLimit = useMemo(
    () => getActiveLimit(selectedPlatforms),
    [selectedPlatforms],
  );
  const counterState = useMemo(
    () => getCounterState(contentText.length, activeLimit),
    [contentText.length, activeLimit],
  );
  const isOverLimit = counterState === "error";
  const hasPlatforms = selectedPlatforms.length > 0;
  const hasContent = contentText.trim().length > 0;
  const canSubmit = hasPlatforms && hasContent && !isOverLimit && !isSubmitting;
  const canSchedule = canSubmit && scheduleEnabled && scheduledAt !== "";

  const togglePlatform = useCallback((platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
    setIsDirty(true);
  }, []);

  const requestClear = () => {
    if (isDirtyComputed) {
      setPendingAction("clear");
      setDiscardDialogOpen(true);
    } else {
      resetForm();
    }
  };

  const confirmDiscard = () => {
    if (pendingAction === "clear") {
      resetForm();
      setIsDirty(false);
    }
    setPendingAction(null);
    setDiscardDialogOpen(false);
  };

  const resetForm = () => {
    setTitle("");
    setContentHtml("");
    setContentText("");
    setSelectedPlatforms([]);
    setScheduleEnabled(false);
    setScheduledAt("");
    setIsDirty(false);
    setMediaAssets([]);
  };

  // Track original AI-generated content for learning signal capture
  const aiGeneratedRef = useRef<Record<string, string>>({});
  const prevContentRef = useRef<string>("");

  const captureEditLearningSignal = useCallback(async (platform: string, originalContent: string, editedContent: string) => {
    if (originalContent === editedContent || Math.abs(editedContent.length - originalContent.length) < 3) return;
    try {
      await fetch("/api/brand-context/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalContent,
          editedContent,
          platform,
          signalType: "post_edit",
        }),
      });
    } catch {
      // Silently fail — learning is non-critical
    }
  }, []);

  const handleContentChange = useCallback((html: string, textContent: string) => {
    // Capture learning signal if editing AI-generated content
    const currentPlatform = selectedPlatforms[0];
    if (currentPlatform && aiGeneratedRef.current[currentPlatform]) {
      const original = aiGeneratedRef.current[currentPlatform];
      if (prevContentRef.current !== textContent && prevContentRef.current === original) {
        captureEditLearningSignal(currentPlatform, original, textContent);
      }
    }
    setContentHtml(html);
    setContentText(textContent);
    setIsDirty(true);
    prevContentRef.current = textContent;
  }, [selectedPlatforms, captureEditLearningSignal]);

  const handleAiInsert = useCallback((platform: string, content: string) => {
    setContentText(content);
    setContentHtml(`<p>${content.replace(/\n/g, "<br/>")}</p>`);
    if (!selectedPlatforms.includes(platform)) {
      setSelectedPlatforms((prev) => [...prev, platform]);
    }
    setActiveTab("manual");
    toast.success("Content inserted", {
      description: `AI-generated content for ${platform} added to compose`,
    });
  }, [selectedPlatforms]);

  const handleSubmit = useCallback(async (action: "draft" | "publish" | "schedule") => {
    if (!canSubmit) return;
    if (action === "schedule" && !scheduledAt) {
      toast.error("Please select a date and time to schedule.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        action,
        title: title || undefined,
        content: contentText.trim(),
        contentHtml: contentHtml || undefined,
        platforms: selectedPlatforms,
        mediaUrls: mediaAssets.length > 0 ? mediaAssets.map((a) => a.publicUrl) : undefined,
      };
      if (action === "schedule" && scheduledAt) {
        body.scheduledAt = new Date(scheduledAt).toISOString();
      }
      if (action === "publish") {
        body.scheduledAt = new Date().toISOString();
      }

      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error ?? "Failed to create post");
        return;
      }

      const data = await res.json();
      const actionLabel =
        action === "draft"
          ? "Draft saved"
          : action === "schedule"
            ? "Post scheduled"
            : "Post created";
      toast.success(`${actionLabel}`, {
        description: `Post ID: ${data.data?.id?.slice(0, 8) ?? "..."}`,
      });
      resetForm();
    } catch {
      toast.error("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, scheduledAt, title, contentText, contentHtml, selectedPlatforms, mediaAssets, resetForm]);

  // Keyboard shortcuts — handler captures latest values via effect deps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (scheduleEnabled) {
          handleSubmit("schedule");
        } else {
          handleSubmit("publish");
        }
        return;
      }

      if ((e.key === "s" || e.key === "S") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit("draft");
        return;
      }

      if (e.key === "Escape" && !isInput) {
        e.preventDefault();
        if (isDirtyComputed) {
          setPendingAction("clear");
          setDiscardDialogOpen(true);
        } else {
          resetForm();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scheduleEnabled, handleSubmit, isDirtyComputed, setPendingAction, setDiscardDialogOpen, resetForm]);

  // Unsaved changes — browser-level beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyComputed) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirtyComputed]);

  const minDateTime = new Date();
  minDateTime.setMinutes(minDateTime.getMinutes() - minDateTime.getTimezoneOffset());
  const minDateTimeStr = minDateTime.toISOString().slice(0, 16);

  return (
    <>
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-foreground">Create Post</h2>
      <div className="flex items-center gap-3">
        <HintTooltip
          hint="Tip: Use @mentions to tag accounts, #hashtags for reach, and keep posts under 280 characters for X"
        />
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" aria-label="Keyboard shortcuts">
              <Keyboard className="size-4" weight="regular" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Keyboard shortcuts</DialogTitle>
              <DialogDescription>Speed up your compose workflow</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Publish now</span>
                <kbd className="rounded border border-border bg-secondary px-2 py-0.5 text-xs font-mono text-foreground">Ctrl+Enter</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Save as draft</span>
                <kbd className="rounded border border-border bg-secondary px-2 py-0.5 text-xs font-mono text-foreground">Ctrl+S</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Clear form</span>
                <kbd className="rounded border border-border bg-secondary px-2 py-0.5 text-xs font-mono text-foreground">Escape</kbd>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "manual" | "ai")} className="mt-4">
      <TabsList variant="line" className="mb-6">
        <TabsTrigger value="manual" className="gap-1.5">
          <PencilSimple className="size-3.5" weight="bold" />
          Manual Compose
        </TabsTrigger>
        <TabsTrigger value="ai" className="gap-1.5">
          <Sparkle className="size-3.5" weight="bold" />
          AI Compose
        </TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="space-y-6 animate-[fade-in_200ms_ease-out]" key="manual">
        <div className="space-y-2">
          <Label htmlFor="compose-title" className="text-xs font-medium">
            Title <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="compose-title"
            placeholder="Give your post a title..."
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">
              Content
            </Label>
            {activeLimit != null && (
              <span
                className={cn("text-xs font-mono tabular-nums transition-colors duration-200", COUNTER_COLOR[counterState])}
              >
                {contentText.length}/{activeLimit}
              </span>
            )}
          </div>
          <RichTextEditor
            content={contentHtml}
            onContentChange={handleContentChange}
            className="focus-within:border-brand"
          />
          {activeLimit == null && (
            <p className="text-xs text-muted-foreground">
              Select a platform below to see the character limit.
            </p>
          )}
          {isOverLimit && activeLimit != null && (
            <p className="text-xs text-compose-counter-error">
              Content exceeds limit by {contentText.length - activeLimit} characters.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-xs font-medium">
            Platforms
          </Label>
          {connectedPlatforms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No accounts connected yet.{" "}
                <a href="/settings?tab=accounts" className="text-brand underline underline-offset-2">
                  Connect an account
                </a>{" "}
                to start composing.
              </p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {connectedPlatforms.map((platform) => {
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-150 hover-scale",
                      isSelected
                        ? "border-brand bg-brand/5"
                        : "border-border hover:bg-muted",
                    )}
                    aria-pressed={isSelected}
                    aria-label={`Select ${PLATFORM_DISPLAY_NAMES[platform]}`}
                  >
                    <span className="text-muted-foreground" aria-hidden="true">
                      {platformIcon(platform)}
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {PLATFORM_DISPLAY_NAMES[platform]}
                    </span>
                    {isSelected && (
                      <Check className="size-4 text-brand animate-[scale-in_150ms_ease-out]" weight="bold" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {selectedPlatforms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground">Posting to:</span>
              {selectedPlatforms.map((p) => (
                <Badge key={p} variant="default" className="gap-1 text-xs normal-case tracking-normal">
                  <span className="size-3">{platformIconSm(p)}</span>
                  {PLATFORM_DISPLAY_NAMES[p]}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium normal-case tracking-normal">
              Media
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMediaPickerOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Image className="size-3.5" weight="bold" />
              Add Media
            </Button>
          </div>
          {mediaAssets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mediaAssets.map((asset) => (
                <div key={asset.id} className="relative group">
                  <img
                    src={asset.publicUrl}
                    alt={asset.originalName}
                    className="size-12 rounded-md object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMediaAssets((prev) => prev.filter((a) => a.id !== asset.id))
                    }
                    className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-destructive/10"
                    aria-label={`Remove ${asset.originalName}`}
                  >
                    <X className="size-3" weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {mediaAssets.length === 0 && (
            <p className="text-xs text-muted-foreground">No media attached</p>
          )}
        </div>

        <PreviewPanel
          selectedPlatforms={selectedPlatforms}
          content={contentText}
          title={title}
          connectedAccounts={connectedAccounts}
        />

        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
          <div className="space-y-0.5">
            <Label htmlFor="schedule-toggle" className="text-sm font-medium normal-case tracking-normal">
              Schedule for later
            </Label>
            <p className="text-xs text-muted-foreground">
              Pick a date and time to publish automatically.
            </p>
          </div>
          <Switch
            id="schedule-toggle"
            checked={scheduleEnabled}
            onCheckedChange={setScheduleEnabled}
          />
        </div>

        {scheduleEnabled && (
          <div className="space-y-2">
            <Label htmlFor="schedule-datetime" className="text-xs font-medium normal-case tracking-normal">
              Publish date & time
            </Label>
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground shrink-0" />
              <Input
                id="schedule-datetime"
                type="datetime-local"
                value={scheduledAt}
                min={minDateTimeStr}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => handleSubmit("draft")}
            disabled={!hasPlatforms || !hasContent || isOverLimit || isSubmitting}
            className="hover-scale"
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-1.5 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <TextT className="mr-1.5 size-4" />
                Save Draft
              </>
            )}
          </Button>
          {!scheduleEnabled && (
            <Button
              size="default"
              onClick={() => handleSubmit("publish")}
              disabled={!canSubmit}
              className="hover-scale"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-1.5 size-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                'Publish Now'
              )}
            </Button>
          )}
          {scheduleEnabled && (
            <Button
              size="default"
              onClick={() => handleSubmit("schedule")}
              disabled={!canSchedule}
              className="hover-scale"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-1.5 size-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <Clock className="mr-1.5 size-4" />
                  Schedule
                </>
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={requestClear}
            disabled={isSubmitting}
            className="hover-scale"
          >
            Clear
          </Button>
        </div>
      </TabsContent>

      <TabsContent value="ai" className="space-y-6 animate-[fade-in_200ms_ease-out]" key="ai">
        <AiComposePanel
          connectedAccounts={connectedAccounts}
          onInsertContent={handleAiInsert}
        />
      </TabsContent>
    </Tabs>

    {/* Discard changes confirmation */}
    <ConfirmDialog
      open={discardDialogOpen}
      onOpenChange={setDiscardDialogOpen}
      title="Unsaved changes"
      description="You have unsaved content. Are you sure you want to discard it?"
      onConfirm={confirmDiscard}
      confirmLabel="Discard"
      cancelLabel="Cancel"
    />

    <MediaPicker
      open={mediaPickerOpen}
      onOpenChange={setMediaPickerOpen}
      selectedAssets={mediaAssets}
      onSelect={setMediaAssets}
    />
    </>
  );
}
