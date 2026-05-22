"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Clock,
  PencilSimple,
  Sparkle,
  TextT,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";
import {
  platformIcon,
  platformIconSm,
  PLATFORM_DISPLAY_NAMES,
} from "@/lib/oauth/platform-icons";
import { PreviewPanel } from "./preview/preview-panel";
import { RichTextEditor } from "./rich-text-editor";

interface ConnectedAccount {
  platform: string;
  platformUsername: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
}

interface ComposeFormProps {
  connectedAccounts: ConnectedAccount[];
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

export function ComposeForm({ connectedAccounts }: ComposeFormProps) {
  const connectedPlatforms = connectedAccounts.map((a) => a.platform);
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [contentText, setContentText] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setContentHtml("");
    setContentText("");
    setSelectedPlatforms([]);
    setScheduleEnabled(false);
    setScheduledAt("");
  }, []);

  const handleContentChange = (html: string, textContent: string) => {
    setContentHtml(html);
    setContentText(textContent);
  };

  const handleSubmit = async (action: "draft" | "publish" | "schedule") => {
    if (!canSubmit) return;
    if (action === "schedule" && !scheduledAt) {
      toast.error("Please select a date and time to schedule.");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title || undefined,
        content: contentText.trim(),
        contentHtml: contentHtml || undefined,
        platforms: selectedPlatforms,
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
  };

  const minDateTime = new Date();
  minDateTime.setMinutes(minDateTime.getMinutes() - minDateTime.getTimezoneOffset());
  const minDateTimeStr = minDateTime.toISOString().slice(0, 16);

  return (
    <Tabs defaultValue="manual" className="mt-4">
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

      <TabsContent value="manual" className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="compose-title" className="text-xs font-medium normal-case tracking-normal">
            Title <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="compose-title"
            placeholder="Give your post a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-base"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium normal-case tracking-normal">
              Content
            </Label>
            {activeLimit != null && (
              <span
                className={cn("text-xs font-mono tabular-nums", COUNTER_COLOR[counterState])}
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
          <Label className="text-xs font-medium normal-case tracking-normal">
            Platforms
          </Label>
          {connectedPlatforms.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No accounts connected yet.{" "}
                <a href="/dashboard/settings?tab=accounts" className="text-brand underline underline-offset-2">
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
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
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
                      <Check className="size-4 text-brand" weight="bold" />
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
            disabled={!hasPlatforms || !hasContent || isSubmitting}
          >
            <TextT className="mr-1.5 size-4" />
            Save Draft
          </Button>
          {!scheduleEnabled && (
            <Button
              size="default"
              onClick={() => handleSubmit("publish")}
              disabled={!canSubmit}
            >
              Publish Now
            </Button>
          )}
          {scheduleEnabled && (
            <Button
              size="default"
              onClick={() => handleSubmit("schedule")}
              disabled={!canSchedule}
            >
              <Clock className="mr-1.5 size-4" />
              Schedule
            </Button>
          )}
        </div>
      </TabsContent>

      <TabsContent value="ai" className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/50 p-8 text-center">
          <Sparkle className="mx-auto mb-4 size-10 text-muted-foreground" weight="thin" />
          <h3 className="text-base font-semibold text-foreground">
            AI Compose coming soon
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Describe what you want to post about and let AI generate platform-optimized drafts for you.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Input
              placeholder="What do you want to post about?"
              className="max-w-md text-base"
              disabled
            />
            <Button size="default" disabled>
              Generate
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
