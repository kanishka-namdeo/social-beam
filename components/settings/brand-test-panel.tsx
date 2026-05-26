"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sparkle, Check, Spinner, ThumbsUp, ThumbsDown } from "@phosphor-icons/react/ssr";
import { PLATFORM_DISPLAY_NAMES, platformIconSm } from "@/lib/oauth/platform-icons";
import { cn } from "@/lib/utils";

const AVAILABLE_PLATFORMS = ["x", "linkedin", "instagram", "facebook", "tiktok"];

interface BrandTestPanelProps {
  connectedPlatforms: string[];
}

interface TestResult {
  platform: string;
  content: string;
  charCount: number;
}

export function BrandTestPanel({ connectedPlatforms }: BrandTestPanelProps) {
  const [topic, setTopic] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(
    connectedPlatforms.length > 0 ? [...connectedPlatforms] : AVAILABLE_PLATFORMS.slice(0, 2)
  );
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [generatingPlatforms, setGeneratingPlatforms] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState(0);

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleTest = async () => {
    if (!topic.trim() || selectedPlatforms.length === 0) return;

    setIsTesting(true);
    setResults([]);
    setGeneratingPlatforms(new Set(selectedPlatforms));
    setError(null);
    setGenerationElapsed(0);

    const interval = setInterval(() => {
      setGenerationElapsed((prev) => prev + 1);
    }, 1000);

    try {
      const res = await fetch("/api/brand-context/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), platforms: selectedPlatforms }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Failed to generate" }));
        toast.error(errData.error ?? "Failed to generate samples");
        setError(errData.error ?? "Failed to generate samples");
        setIsTesting(false);
        setGeneratingPlatforms(new Set());
        clearInterval(interval);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Stream not available");
        setIsTesting(false);
        setGeneratingPlatforms(new Set());
        clearInterval(interval);
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
              } else if (eventType === "complete") {
                setIsTesting(false);
                clearInterval(interval);
                toast.success("Test samples generated", {
                  description: `${data.results?.length ?? 0} samples generated`,
                });
              } else if (eventType === "error") {
                setError(data.error ?? "Generation failed");
                setIsTesting(false);
                clearInterval(interval);
                setGeneratingPlatforms(new Set());
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      toast.error("Failed to generate samples. Please try again.");
      setError("Network error occurred");
      setIsTesting(false);
      clearInterval(interval);
      setGeneratingPlatforms(new Set());
    }
  };

  const handleFeedback = async (platform: string, content: string, positive: boolean) => {
    try {
      await fetch("/api/brand-context/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalContent: content,
          editedContent: content,
          platform,
          signalType: positive ? "thumbs_up" : "thumbs_down",
          context: content,
        }),
      });
      toast.success(positive ? "Feedback recorded" : "Feedback recorded");
    } catch {
      // silently fail
    }
  };

  const canTest = topic.trim().length > 0 && selectedPlatforms.length > 0 && !isTesting;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkle className="size-5 text-brand" weight="fill" />
          Test Your Brand Voice
        </CardTitle>
        <CardDescription>
          See how your brand sounds on any topic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="test-topic" className="text-sm font-medium">Topic</Label>
          <Textarea
            id="test-topic"
            placeholder="e.g., Announcing our new product launch..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isTesting}
            className="min-h-[80px] border-border focus-within:border-brand"
          />
        </div>

        <div className="space-y-2">
          <Label>Platforms</Label>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {AVAILABLE_PLATFORMS.map((platform) => {
              const isSelected = selectedPlatforms.includes(platform);
              return (
                <Button
                  key={platform}
                  type="button"
                  variant={isSelected ? "outline" : "ghost"}
                  onClick={() => togglePlatform(platform)}
                  disabled={isTesting}
                  className={cn(
                    "justify-start gap-3 h-auto p-3 min-h-10",
                    isSelected && "border-brand bg-brand/5",
                  )}
                >
                  <span className="text-muted-foreground">{platformIconSm(platform)}</span>
                  <span className="flex-1 text-sm font-medium">{PLATFORM_DISPLAY_NAMES[platform] ?? platform}</span>
                  {isSelected && <Check className="size-4 text-brand" weight="bold" />}
                </Button>
              );
            })}
          </div>
        </div>

        <Button
          onClick={handleTest}
          disabled={!canTest}
          className="w-full min-h-10"
        >
          {isTesting ? (
            <>
              <Spinner className="size-4 mr-2 animate-spin" />
              Generating samples... ({generationElapsed}s)
            </>
          ) : (
            <>
              <Sparkle className="size-4 mr-2" weight="fill" />
              Generate Preview
            </>
          )}
        </Button>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {(results.length > 0 || generatingPlatforms.size > 0) && (
          <div className="space-y-3">
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Results</p>
            {selectedPlatforms.map((platform) => {
              const result = results.find((r) => r.platform === platform);
              const isGenerating = generatingPlatforms.has(platform);

              return (
                <div key={platform} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{platformIconSm(platform)}</span>
                      <span className="text-sm font-medium">{PLATFORM_DISPLAY_NAMES[platform] ?? platform}</span>
                    </div>
                    {isGenerating && <Badge variant="outline">Generating...</Badge>}
                    {result && <Badge variant="outline">{result.charCount} chars</Badge>}
                  </div>

                  {isGenerating && (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  )}

                  {result && (
                    <>
                      <div className="rounded-md bg-muted/50 p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{result.content}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 gap-1 text-xs"
                          onClick={() => handleFeedback(platform, result.content, true)}
                        >
                          <ThumbsUp className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10 gap-1 text-xs"
                          onClick={() => handleFeedback(platform, result.content, false)}
                        >
                          <ThumbsDown className="size-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
