"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkle, Check, ArrowCircleRight, Spinner } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  platformIconSm,
  PLATFORM_DISPLAY_NAMES,
} from "@/lib/oauth/platform-icons";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";

interface ConnectedAccount {
  platform: string;
  platformUsername: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
}

interface AiComposePanelProps {
  connectedAccounts: ConnectedAccount[];
  onInsertContent: (platform: string, content: string) => void;
}

interface GeneratedResult {
  platform: string;
  content: string;
  charCount: number;
}

export function AiComposePanel({ connectedAccounts, onInsertContent }: AiComposePanelProps) {
  const connectedPlatforms = connectedAccounts.map((a) => a.platform);
  const [prompt, setPrompt] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedResult[]>([]);
  const [generatingPlatforms, setGeneratingPlatforms] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  // Track elapsed time — lint-compliant: setState only in interval callback, not in effect body
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastPlatforms, setLastPlatforms] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    const interval = setInterval(() => {
      if (isGenerating) {
        setGenerationElapsed((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (connectedPlatforms.length > 0 && selectedPlatforms.length === 0 && !hasAutoSelected) {
    setHasAutoSelected(true);
    setSelectedPlatforms([...connectedPlatforms]);
  }

  const togglePlatform = useCallback((platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform],
    );
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim() || selectedPlatforms.length === 0) return;

    setLastPrompt(prompt.trim());
    setLastPlatforms([...selectedPlatforms]);
    setRetryCount(0);
    setIsGenerating(true);
    setResults([]);
    setGeneratingPlatforms(new Set(selectedPlatforms));
    setError(null);

    try {
      const res = await fetch("/api/compose/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          platforms: selectedPlatforms,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to generate" }));
        if (res.status === 402) {
          toast.error("Insufficient AI credits", {
            description: `Need ${errData.required ?? "?"} credits, have ${errData.balance ?? 0}`,
          });
        } else {
          toast.error(errData.error ?? "Failed to generate content");
        }
        setError(errData.error ?? "Failed to generate content");
        setIsGenerating(false);
        setGeneratingPlatforms(new Set());
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Stream not available");
        setIsGenerating(false);
        setGeneratingPlatforms(new Set());
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by \n\n
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split("\n");
          let eventType = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6);
            }
          }

          if (eventType && dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === "platform_start") {
                setGeneratingPlatforms((prev) => new Set(prev));
              } else if (eventType === "platform_done") {
                setResults((prev) => [...prev, { platform: data.platform, content: data.content, charCount: data.charCount }]);
                setGeneratingPlatforms((prev) => {
                  const next = new Set(prev);
                  next.delete(data.platform);
                  return next;
                });
              } else if (eventType === "platform_error") {
                setGeneratingPlatforms((prev) => {
                  const next = new Set(prev);
                  next.delete(data.platform);
                  return next;
                });
                toast.error(`Failed to generate for ${PLATFORM_DISPLAY_NAMES[data.platform] ?? data.platform}`);
              } else if (eventType === "complete") {
                setIsGenerating(false);
                toast.success("Content generated", {
                  description: `${data.results?.length ?? 0} posts generated`,
                });
              } else if (eventType === "error") {
                setError(data.error ?? "Generation failed");
                setIsGenerating(false);
                setGeneratingPlatforms(new Set());
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      toast.error("Failed to generate content. Please try again.");
      setError("Network error occurred");
      setIsGenerating(false);
      setGeneratingPlatforms(new Set());
      setRetryCount((prev) => prev + 1);
    }
  };

  const handleRetry = async () => {
    if (retryCount >= MAX_RETRIES) {
      toast.error("Too many retries. Please wait a moment and try again.");
      return;
    }
    setPrompt(lastPrompt);
    setSelectedPlatforms(lastPlatforms);
    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/compose/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lastPrompt,
          platforms: lastPlatforms,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to generate" }));
        if (res.status === 402) {
          toast.error("Insufficient AI credits", {
            description: `Need ${errData.required ?? "?"} credits, have ${errData.balance ?? 0}`,
          });
        } else {
          toast.error(errData.error ?? "Failed to generate content");
        }
        setError(errData.error ?? "Failed to generate content");
        setIsGenerating(false);
        setGeneratingPlatforms(new Set());
        setRetryCount((prev) => prev + 1);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Stream not available");
        setIsGenerating(false);
        setGeneratingPlatforms(new Set());
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
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6);
            }
          }

          if (eventType && dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === "platform_start") {
                setGeneratingPlatforms((prev) => new Set(prev));
              } else if (eventType === "platform_done") {
                setResults((prev) => [...prev, { platform: data.platform, content: data.content, charCount: data.charCount }]);
                setGeneratingPlatforms((prev) => {
                  const next = new Set(prev);
                  next.delete(data.platform);
                  return next;
                });
              } else if (eventType === "platform_error") {
                setGeneratingPlatforms((prev) => {
                  const next = new Set(prev);
                  next.delete(data.platform);
                  return next;
                });
                toast.error(`Failed to generate for ${PLATFORM_DISPLAY_NAMES[data.platform] ?? data.platform}`);
              } else if (eventType === "complete") {
                setIsGenerating(false);
                setRetryCount(0);
                toast.success("Content generated", {
                  description: `${data.results?.length ?? 0} posts generated`,
                });
              } else if (eventType === "error") {
                setError(data.error ?? "Generation failed");
                setIsGenerating(false);
                setGeneratingPlatforms(new Set());
                setRetryCount((prev) => prev + 1);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      toast.error("Failed to generate content. Please try again.");
      setError("Network error occurred");
      setIsGenerating(false);
      setGeneratingPlatforms(new Set());
      setRetryCount((prev) => prev + 1);
    }
  };

  const canGenerate = prompt.trim().length > 0 && selectedPlatforms.length > 0 && !isGenerating;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ai-prompt" className="text-xs font-medium normal-case tracking-normal">
          What do you want to post about?
        </Label>
        <Input
          id="ai-prompt"
          placeholder="e.g., Our new AI-powered analytics dashboard launches next week..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="text-base"
          disabled={isGenerating}
        />
      </div>

      <div className="space-y-3">
        <Label className="text-xs font-medium normal-case tracking-normal">
          Generate for platforms
        </Label>
        {connectedPlatforms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No accounts connected yet.{" "}
              <a href="/settings?tab=accounts" className="text-brand underline underline-offset-2">
                Connect an account
              </a>{" "}
              to use AI Compose.
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
                  aria-label={`Generate for ${PLATFORM_DISPLAY_NAMES[platform]}`}
                  disabled={isGenerating}
                >
                  <span className="text-muted-foreground" aria-hidden="true">
                    {platformIconSm(platform)}
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
      </div>

      <Button
        size="default"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full hover-scale"
      >
        {isGenerating ? (
          <>
            <Spinner className="mr-1.5 size-4 animate-spin" />
            {generationElapsed > 5
              ? `Generating... (${generationElapsed}s)`
              : "Generating..."}
          </>
        ) : (
          <>
            <Sparkle className="mr-1.5 size-4" weight="fill" />
            Generate {selectedPlatforms.length > 1 ? `${selectedPlatforms.length} Posts` : "Post"}
          </>
        )}
      </Button>

      {connectedPlatforms.length > 0 && !canGenerate && prompt.trim().length === 0 && selectedPlatforms.length === 0 && (
        <p className="text-xs text-muted-foreground text-center -mt-2">
          Enter a topic and select at least one platform to generate content
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm text-destructive">
            Something went wrong while generating content. This can happen during high traffic.
          </p>
          <p className="text-sm text-destructive">
            {error}
          </p>
          {retryCount < MAX_RETRIES ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isGenerating}
              className="gap-1.5"
            >
              <Sparkle className="size-3.5" weight="fill" />
              Try Again ({MAX_RETRIES - retryCount} retries left)
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Maximum retries reached. Please try again later.
            </p>
          )}
        </div>
      )}

      {(results.length > 0 || generatingPlatforms.size > 0) && (
        <div className="space-y-4">
          <Label className="text-xs font-medium normal-case tracking-normal">
            Generated Content
          </Label>

          {connectedPlatforms
            .filter((p) => selectedPlatforms.includes(p))
            .map((platform) => {
              const result = results.find((r) => r.platform === platform);
              const isGenerating = generatingPlatforms.has(platform);
              const limit = PLATFORM_CHAR_LIMITS[platform] ?? null;

              return (
                <div key={platform} className={cn(
                  "rounded-lg border border-border bg-card p-4 space-y-3 transition-all",
                  isGenerating && "border-brand/40 shadow-[0_0_0_1px_var(--brand-soft)]",
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {platformIconSm(platform)}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {PLATFORM_DISPLAY_NAMES[platform]}
                      </span>
                    </div>
                    {isGenerating && (
                      <Badge variant="outline" className="text-xs">
                        Generating...
                      </Badge>
                    )}
                    {result && (
                      <Badge variant="outline" className="text-xs">
                        {result.charCount}{limit ? ` / ${limit}` : ""} chars
                      </Badge>
                    )}
                  </div>

                  {isGenerating && (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  )}

                  {result && (
                    <>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {result.content}
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onInsertContent(platform, result.content)}
                        className="gap-1.5"
                      >
                        <ArrowCircleRight className="size-4" weight="bold" />
                        Use this in compose
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
