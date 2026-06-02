"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Image,
  Keyboard,
  Sparkle,
  Spinner,
  TextT,
  WarningCircle,
  X,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { MediaPicker } from "@/components/media/media-picker";
import { useInvisibleAI } from "@/lib/invisible-ai-context";
import type { MediaAsset } from "@/lib/media/types";
import { VariantCard } from "./variant-card";
import { ModifierBar, type ModifierKey } from "./modifier-bar";
import { VARIANT_MODIFIERS } from "@/lib/ai/compose-prompt-builder";

const variantIds = Object.keys(VARIANT_MODIFIERS).map(Number);

interface ConnectedAccount {
  platform: string;
  platformUsername: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
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

function SortableMediaItem({ asset, onRemove }: { asset: MediaAsset; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: asset.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <img
        src={asset.publicUrl}
        alt={asset.originalName}
        className="size-12 rounded-sm object-cover border border-border"
      />
      <div
        {...attributes}
        {...listeners}
        className="absolute -top-1 -left-1 min-h-5 min-w-5 rounded-sm bg-background border border-border flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Drag to reorder ${asset.originalName}`}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-muted-foreground">
          <circle cx="3" cy="2" r="1" fill="currentColor" />
          <circle cx="9" cy="2" r="1" fill="currentColor" />
          <circle cx="3" cy="6" r="1" fill="currentColor" />
          <circle cx="9" cy="6" r="1" fill="currentColor" />
          <circle cx="3" cy="10" r="1" fill="currentColor" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
        </svg>
      </div>
      <button
        type="button"
        onClick={() => onRemove(asset.id)}
        className="absolute -top-1.5 -right-1.5 min-h-6 min-w-6 rounded-sm bg-background border border-border flex items-center justify-center hover:bg-destructive/10"
        aria-label={`Remove ${asset.originalName}`}
      >
        <X className="size-3" weight="bold" />
      </button>
    </div>
  );
}

export function ComposeForm({ connectedAccounts, initialPrompt }: ComposeFormProps) {
  const connectedPlatforms = connectedAccounts.map((a) => a.platform);
  const [title, setTitle] = useState(initialPrompt ? initialPrompt.slice(0, 80) : "");
  const [contentHtml, setContentHtml] = useState(initialPrompt ? `<p>${initialPrompt}</p>` : "");
  const [contentText, setContentText] = useState(initialPrompt ?? "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setMediaAssets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveMedia = useCallback((id: string) => {
    setMediaAssets((prev) => prev.filter((a) => a.id !== id));
  }, [setMediaAssets]);

  const { config } = useInvisibleAI();

  // AI suggestion state — now supports 4 variants streamed in parallel
  const [topicPrompt, setTopicPrompt] = useState(initialPrompt ?? "");
  const [suggestionPlatform, setSuggestionPlatform] = useState<string>("");
  const [variants, setVariants] = useState<Record<number, string>>({});
  const [variantComplete, setVariantComplete] = useState<Set<number>>(new Set());
  const [variantError, setVariantError] = useState<string | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const userEditedSinceLastSuggestion = useRef(false);

  // Modifier state
  const [isModifying, setIsModifying] = useState(false);
  const [activeModifier, setActiveModifier] = useState<ModifierKey | null>(null);
  const modifierAbortRef = useRef<AbortController | null>(null);

  // Selected variant for "Use this"
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // Keep ref in sync for dismissal guard

  // Detect mobile/touch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(
      typeof navigator !== "undefined" &&
        (navigator.maxTouchPoints > 0 || "ontouchstart" in window),
    );
  }, []);

  // Default suggestion platform
  useEffect(() => {
    if (!suggestionPlatform && connectedPlatforms.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestionPlatform(connectedPlatforms[0]);
    }
  }, [connectedPlatforms, suggestionPlatform]);

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
    setTopicPrompt("");
    setVariants({});
    setVariantComplete(new Set());
    setVariantError(null);
    setSelectedVariantId(null);
    setActiveModifier(null);
    userEditedSinceLastSuggestion.current = true;
  };

  // Track original AI-generated content for learning signal capture
  const aiGeneratedRef = useRef<Record<string, string>>({});
  const prevContentRef = useRef<string>("");
  const learningCapturedRef = useRef<Record<string, boolean>>({});

  const captureEditLearningSignal = useCallback(async (platform: string, originalContent: string, editedContent: string) => {
    if (originalContent === editedContent || Math.abs(editedContent.length - originalContent.length) < 3) return;
    try {
      const res = await fetch("/api/brand-context/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalContent,
          editedContent,
          platform,
          signalType: "post_edit_diff",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.extracted > 0) {
          toast.success("Brand learning updated", {
            description: `Captured ${data.data.extracted} signal(s) from your edit`,
            duration: 3000,
          });
        }
      }
    } catch {
      // Silently fail — learning is non-critical
    }
  }, []);

  const captureModifierLearningSignal = useCallback(async (
    platform: string,
    originalContent: string,
    modifiedContent: string,
    modifier: ModifierKey,
  ) => {
    if (originalContent === modifiedContent) return;
    try {
      const res = await fetch("/api/brand-context/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalContent,
          editedContent: modifiedContent,
          platform,
          signalType: "modifier_transform",
          metadata: { modifier },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.extracted > 0) {
          toast.success("Brand learning updated", {
            description: `Captured ${data.data.extracted} signal(s) from ${modifier} transform`,
            duration: 3000,
          });
        }
      }
    } catch {
      // Silently fail
    }
  }, []);

  const handleContentChange = useCallback((html: string, textContent: string) => {
    // Mark that user typed — dismiss variants immediately
    if (Object.keys(variants).length > 0) {
      setVariants({});
      setVariantComplete(new Set());
    }
    userEditedSinceLastSuggestion.current = true;

    // Capture learning signal if editing AI-generated content
    const currentPlatform = selectedPlatforms[0];
    if (currentPlatform && aiGeneratedRef.current[currentPlatform] && !learningCapturedRef.current[currentPlatform]) {
      const original = aiGeneratedRef.current[currentPlatform];
      const charDiff = Math.abs(textContent.length - original.length);
      const pctDiff = charDiff / Math.max(original.length, 1);
      if (charDiff >= 50 || pctDiff >= 0.1) {
        captureEditLearningSignal(currentPlatform, original, textContent);
        learningCapturedRef.current[currentPlatform] = true;
      }
    }
    setContentHtml(html);
    setContentText(textContent);
    setIsDirty(true);
    prevContentRef.current = textContent;
  }, [selectedPlatforms, captureEditLearningSignal, variants]);

  const handleSuggestionAccept = useCallback((variantId: number, content: string) => {
    setContentText(content);
    setContentHtml(`<p>${content.replace(/\n/g, "<br/>")}</p>`);
    if (suggestionPlatform) {
      aiGeneratedRef.current[suggestionPlatform] = content;
      learningCapturedRef.current[suggestionPlatform] = false;
    }
    prevContentRef.current = "";
    setVariants({});
    setVariantComplete(new Set());
    setVariantError(null);
    setSelectedVariantId(variantId);
    // Mark as user-edited so stale follow-up suggestions don't reappear
    userEditedSinceLastSuggestion.current = true;
    setIsDirty(true);
  }, [suggestionPlatform]);

  // Debounced suggestion fetch — now streams 4 variants in parallel
  useEffect(() => {
    const trimmed = topicPrompt.trim();
    if (!trimmed || trimmed.length < 3 || !suggestionPlatform) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVariants({});
      setVariantComplete(new Set());
      setVariantError(null);
      setIsSuggestionLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    userEditedSinceLastSuggestion.current = false;
    setIsSuggestionLoading(true);
    setVariants({});
    setVariantComplete(new Set());
    setVariantError(null);
    setSelectedVariantId(null);

    const timer = setTimeout(async () => {
      if (controller.signal.aborted) return;

      try {
        const res = await fetch("/api/compose/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, platform: suggestionPlatform }),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 429) {
            setVariantError("Too many requests — please wait a moment before trying again.");
          } else if (res.status === 401) {
            setVariantError("Not authenticated. Please sign in again.");
          } else {
            setVariantError("Failed to generate suggestions. Please try again.");
          }
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setVariantError("Streaming not supported. Please try again.");
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;
            const lines = part.split("\n");
            let eventType = "";
            let dataStr = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7);
              else if (line.startsWith("data: ")) dataStr = line.slice(6);
            }

            if (eventType === "variant_chunk" && dataStr) {
              const data = JSON.parse(dataStr);
              if (!controller.signal.aborted && !userEditedSinceLastSuggestion.current && data.variantId != null) {
                setVariants(prev => ({
                  ...prev,
                  [data.variantId]: data.content ?? "",
                }));
              }
            }
            if (eventType === "variant_done" && dataStr) {
              const data = JSON.parse(dataStr);
              if (!controller.signal.aborted && !userEditedSinceLastSuggestion.current && data.variantId != null) {
                setVariants(prev => ({
                  ...prev,
                  [data.variantId]: data.content ?? "",
                }));
                setVariantComplete(prev => new Set(prev).add(data.variantId));
              }
            }
            if (eventType === "variant_error" && dataStr) {
              const data = JSON.parse(dataStr);
              if (!controller.signal.aborted && data.variantId != null) {
                setVariantError(prev => prev ?? `Variant ${data.variantId} failed to generate`);
                setVariantComplete(prev => new Set(prev).add(data.variantId));
              }
            }
            // Backward compatibility: single suggestion events (no variantId)
            if (eventType === "content_chunk" && dataStr) {
              const data = JSON.parse(dataStr);
              if (!controller.signal.aborted && !userEditedSinceLastSuggestion.current) {
                setVariants(prev => ({ ...prev, 0: data.content ?? "" }));
              }
            }
            if (eventType === "platform_done" && dataStr) {
              const data = JSON.parse(dataStr);
              if (!controller.signal.aborted && !userEditedSinceLastSuggestion.current) {
                setVariants(prev => ({ ...prev, 0: data.content ?? "" }));
                setVariantComplete(prev => new Set(prev).add(0));
              }
            }
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setVariantError("Network error — check your connection and try again.");
        }
      } finally {
        setIsSuggestionLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [topicPrompt, suggestionPlatform]);

  // Modifier handler — transforms accepted content via SSE
  const handleModifier = useCallback(async (modifier: ModifierKey) => {
    if (!contentText.trim() || !suggestionPlatform) return;

    if (modifierAbortRef.current) {
      modifierAbortRef.current.abort();
    }

    const controller = new AbortController();
    modifierAbortRef.current = controller;

    // Capture original content at click time — avoid stale closure
    const originalContent = contentText.trim();

    setIsModifying(true);
    setActiveModifier(modifier);

    try {
      const res = await fetch("/api/compose/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: originalContent,
          modifier,
          platform: suggestionPlatform,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        toast.error("Failed to modify content. Please try again.");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let modifiedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n");
          let eventType = "";
          let dataStr = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ")) dataStr = line.slice(6);
          }

          if (eventType === "content_chunk" && dataStr) {
            const data = JSON.parse(dataStr);
            modifiedContent = data.content ?? "";
            // Do NOT update editor during streaming — avoids cascading state updates
          }
          if (eventType === "done" && dataStr) {
            const data = JSON.parse(dataStr);
            const finalContent = data.content ?? modifiedContent;
            // Single update when complete — RichTextEditor handles this cleanly
            setContentText(finalContent);
            setContentHtml(`<p>${finalContent.replace(/\n/g, "<br/>")}</p>`);
            if (suggestionPlatform) {
              aiGeneratedRef.current[suggestionPlatform] = finalContent;
            }
            // Capture modifier transformation as learning signal
            if (originalContent !== finalContent) {
              captureModifierLearningSignal(suggestionPlatform, originalContent, finalContent, modifier);
            }
          }
        }
      }

      setIsDirty(true);
    } catch (err) {
      if (!controller.signal.aborted) {
        toast.error("Network error during modification.");
      }
    } finally {
      setIsModifying(false);
      setActiveModifier(null);
    }
  }, [contentText, suggestionPlatform]);

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

      // Capture final learning signal if AI content was edited before publish
      const publishPlatform = selectedPlatforms[0];
      if (publishPlatform && aiGeneratedRef.current[publishPlatform]) {
        const original = aiGeneratedRef.current[publishPlatform];
        if (contentText.trim() !== original && !learningCapturedRef.current[publishPlatform]) {
          await captureEditLearningSignal(publishPlatform, original, contentText.trim());
        }
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
      // Reset learning capture refs so next AI suggestion cycle can capture again
      learningCapturedRef.current = {};
      aiGeneratedRef.current = {};
      resetForm();
    } catch {
      toast.error("Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, scheduledAt, title, contentText, contentHtml, selectedPlatforms, mediaAssets, resetForm, captureEditLearningSignal]);

  // Keyboard shortcuts
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
      <h2 className="text-lg font-semibold text-foreground tracking-tight">Create Post</h2>
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

    <div className="space-y-6 mt-4">
      {/* Topic input with platform switcher */}
      <div className="space-y-2">
        <Label htmlFor="topic-prompt" className="text-xs font-medium normal-case tracking-tight">
          What do you want to post about?
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="topic-prompt"
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            placeholder="e.g., Announcing our new AI-powered analytics dashboard..."
            className="text-base"
            maxLength={500}
          />
          {connectedPlatforms.length > 0 && (
            <div className="flex gap-1 shrink-0">
              {connectedPlatforms.slice(0, 3).map((p) => {
                const isActive = p === suggestionPlatform;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSuggestionPlatform(p)}
                    className={cn(
                      "rounded-sm border px-2 py-1 text-xs transition-all min-h-7",
                      isActive ? "border-l-brand border-l-2 bg-brand/5" : "border-border hover:bg-muted",
                    )}
                  >
                    {PLATFORM_DISPLAY_NAMES[p] ?? p}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {topicPrompt.length > 400 && (
          <p className="text-xs text-muted-foreground">{topicPrompt.length}/500</p>
        )}
        {connectedPlatforms.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {config.showAILabels ? "Connect a social account to enable AI suggestions." : "Connect a social account to enable suggestions."}{" "}
            <Link href="/settings?tab=accounts" className="text-brand underline underline-offset-2">
              Connect accounts
            </Link>
          </p>
        )}
      </div>

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
          isMobile={isMobile}
          className={cn(
            "focus-within:border-brand",
            isSuggestionLoading && "border-brand/30 ring-2 ring-brand/10",
          )}
        />

        {/* Variant cards — rendered when AI suggestions are generating */}
        {isSuggestionLoading && Object.keys(variants).length === 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Spinner className="size-3 animate-spin text-brand" weight="bold" />
            {config.showAILabels ? "Generating AI suggestions..." : "Generating suggestions..."}
          </p>
        )}

        {variantError && !isSuggestionLoading && Object.keys(variants).length === 0 && (
          <p className="text-xs text-compose-counter-error flex items-center gap-1.5">
            <WarningCircle className="size-3" weight="bold" />
            {variantError}
          </p>
        )}

        {/* Variant card grid */}
        {Object.keys(variants).length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkle className="size-3 text-brand" weight="fill" />
                {config.showAILabels ? "AI suggestions — pick one to use" : "Suggestions — pick one"}
              </p>
              {!isSuggestionLoading && (
                <p className="text-xs text-muted-foreground">
                  {variantComplete.size}/{Object.keys(VARIANT_MODIFIERS).length} ready
                </p>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {variantIds.map((vid) => (
                <VariantCard
                  key={vid}
                  variantId={vid}
                  content={variants[vid] ?? ""}
                  isComplete={variantComplete.has(vid)}
                  isSelected={selectedVariantId === vid}
                  onSelect={handleSuggestionAccept}
                />
              ))}
            </div>
          </div>
        )}

        {/* Modifier bar — shown after content exists in editor */}
        {contentText.trim().length > 0 && !isSuggestionLoading && (
          <ModifierBar
            onModify={handleModifier}
            isModifying={isModifying}
            activeModifier={activeModifier}
          />
        )}

        {activeLimit == null && !isSuggestionLoading && Object.keys(variants).length === 0 && contentText.trim().length === 0 && (
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
        <p className="text-sm font-medium text-foreground">
          Platforms
        </p>
        {connectedPlatforms.length === 0 ? (
          <div className="rounded-sm border border-dashed border-border p-6 text-center">
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
                <Button
                  key={platform}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  onClick={() => togglePlatform(platform)}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-sm justify-start p-3 text-left transition-all duration-150 hover-scale",
                    isSelected
                      ? "border-l-2 border-l-brand bg-brand/5"
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
                </Button>
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
          <p className="text-sm font-medium text-foreground normal-case tracking-normal">
            Media
          </p>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={mediaAssets.map((a) => a.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-wrap gap-2">
                {mediaAssets.map((asset) => (
                  <SortableMediaItem
                    key={asset.id}
                    asset={asset}
                    onRemove={handleRemoveMedia}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
        mediaAssets={mediaAssets}
      />

      <div className="flex items-center justify-between rounded-sm border border-border bg-card p-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground normal-case tracking-normal">
            Schedule for later
          </p>
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
          <p className="text-sm font-medium text-foreground normal-case tracking-normal">
            Publish date & time
          </p>
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
          size="default"
          onClick={requestClear}
          disabled={isSubmitting}
          className="hover-scale"
          aria-label="Clear form"
        >
          Clear
        </Button>
      </div>
    </div>

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
