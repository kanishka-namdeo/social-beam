"use client";

import React, { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkle,
  Warning,
  CheckCircle,
  Globe,
  Robot,
  Spinner,
  Users,
  Megaphone,
  Target,
  ArrowRight,
  PencilSimple,
} from "@phosphor-icons/react/ssr";
import { BrandContextReview } from "./brand-context-review";
import { BrandContextInlineEdit } from "./brand-context-inline-edit";

interface Finding {
  type: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: Array<{ key: string; value: string | string[] | null }>;
  timestamp: number;
}

const FINDING_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  content_summary: Globe,
  identity_extracted: Sparkle,
  voice_extracted: Megaphone,
  audience_extracted: Users,
  platform_ready: Target,
};

const FINDING_LABELS: Record<string, string> = {
  content_summary: "Content discovered",
  identity_extracted: "Brand identity",
  voice_extracted: "Voice detected",
  audience_extracted: "Audience profile",
  platform_ready: "Platform strategy",
};

interface SSEEvent {
  content?: string;
  step?: string;
  draft?: Record<string, unknown>;
  platforms?: Record<string, unknown>;
  samples?: Array<{ platform: string; content: string }>;
  connectedPlatforms?: string[];
  accountDetails?: Record<string, { platformUsername?: string; followerCount?: number }>;
  interrupted?: boolean;
  threadId?: string;
  done?: boolean;
  saved?: boolean;
  error?: string;
  content_summary?: { pagesFound: string[]; pageCount: number };
  identity_extracted?: { businessName: string | null; tagline: string | null; industry: string | null };
  voice_extracted?: { tonePreset: string | null; voiceDescription: string | null };
  audience_extracted?: { audienceType: string | null; interests: string[]; painPoints: string[] };
  platform_ready?: { platform: string; tonePreset: string | null; contentStyle: string | null };
}

type Phase = "idle" | "streaming" | "review" | "editing" | "saving" | "complete" | "error";

const URL_ANALYSIS_STEPS = [
  { id: "collect", label: "Crawling website", icon: Globe },
  { id: "brandAnalyzer", label: "Analyzing brand voice", icon: Robot },
  { id: "adapt", label: "Generating platform strategies", icon: Globe },
  { id: "sampleGenerator", label: "Creating sample posts", icon: Sparkle },
  { id: "review", label: "Review ready", icon: CheckCircle },
];

const TEXT_ANALYSIS_STEPS = [
  { id: "collect", label: "Reading description", icon: PencilSimple },
  { id: "brandAnalyzer", label: "Analyzing brand voice", icon: Robot },
  { id: "adapt", label: "Generating platform strategies", icon: Globe },
  { id: "sampleGenerator", label: "Creating sample posts", icon: Sparkle },
  { id: "review", label: "Review ready", icon: CheckCircle },
];

const DESCRIPTION_EXAMPLE =
  "e.g., We're a B2B SaaS company helping small businesses manage their finances. Professional but approachable tone. Target audience is founders and finance managers at startups.";

const MAX_DESCRIPTION_CHARS = 2000;

export function BrandConversationalUI() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [brandDescription, setBrandDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState("collect");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [platforms, setPlatforms] = useState<Record<string, unknown>>({});
  const [samples, setSamples] = useState<Array<{ platform: string; content: string }>>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  const [accountDetails, setAccountDetails] = useState<Record<string, { platformUsername?: string; followerCount?: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [currentSubStep, setCurrentSubStep] = useState("");
  const [savedSummary, setSavedSummary] = useState<{
    businessName?: string;
    tonePreset?: string;
    audienceType?: string;
    platformCount: number;
  } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>("idle");

  // Keep phaseRef in sync with current phase for timeout callbacks
  React.useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  function getAnalysisSteps() {
    return inputMode === "url" ? URL_ANALYSIS_STEPS : TEXT_ANALYSIS_STEPS;
  }

  function getStepIndex(): number {
    return getAnalysisSteps().findIndex((s) => s.id === currentStep);
  }

  function extractFinding(event: SSEEvent): Finding | null {
    const typeKeys = ["content_summary", "identity_extracted", "voice_extracted", "audience_extracted", "platform_ready"] as const;
    for (const key of typeKeys) {
      if (event[key] !== undefined) {
        const Icon = FINDING_ICONS[key] ?? Globe;
        const label = FINDING_LABELS[key] ?? key;
        const data = event[key] as Record<string, unknown>;
        const fields = Object.entries(data).map(([k, v]) => ({
          key: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
          value: Array.isArray(v) ? v as string[] : v as string | null,
        }));
        return { type: key, label, icon: Icon, fields, timestamp: Date.now() };
      }
    }
    return null;
  }

  /** Update the current sub-step description based on step + streamed content */
  function updateSubStep(step: string) {
    const subStepMessages: Record<string, string> = {
      collect: "Crawling website pages...",
      analyze: "Analyzing brand identity...",
      adapt: "Generating platform strategies...",
      review: "Preparing results for review...",
    };
    setCurrentSubStep(subStepMessages[step] ?? "");
  }

  /** Process an SSE stream and accumulate state */
  async function processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
  ): Promise<void> {
    const decoder = new TextDecoder();
    let hasReceivedInterrupt = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal.aborted) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6)) as SSEEvent;

            if (event.content) {
              // content tokens still contribute to sub-step updates but no longer accumulate raw text
            }
            if (event.step) {
              setCurrentStep(event.step);
              updateSubStep(event.step);
            }

            // Process granular findings
            const finding = extractFinding(event);
            if (finding) {
              setFindings((prev) => [...prev, finding]);
            }

            if (event.draft) {
              setDraft((prev) => ({ ...prev, ...event.draft }));
            }
            if (event.platforms) {
              setPlatforms(event.platforms as Record<string, unknown>);
            }
            if (event.samples) {
              setSamples(event.samples);
            }
            if (event.connectedPlatforms) {
              setConnectedPlatforms(event.connectedPlatforms);
            }
            if (event.accountDetails) {
              setAccountDetails(event.accountDetails);
            }
            if (event.interrupted) {
              hasReceivedInterrupt = true;
              if (event.threadId) {
                setThreadId(event.threadId);
              }
              if (event.draft) setDraft(event.draft);
              if (event.platforms) setPlatforms(event.platforms);
              if (event.samples) setSamples(event.samples);
              if (event.connectedPlatforms) setConnectedPlatforms(event.connectedPlatforms);
              if (event.accountDetails) setAccountDetails(event.accountDetails);
            }
            if (event.saved) {
              const businessName = typeof draft.businessName === "string" ? draft.businessName : undefined;
              const tonePreset = typeof draft.tonePreset === "string" ? draft.tonePreset : undefined;
              const audienceType = typeof draft.audienceType === "string" ? draft.audienceType : undefined;
              const platformCount = Object.keys(platforms).length;
              setSavedSummary({ businessName, tonePreset, audienceType, platformCount });
              setPhase("complete");
            }
            if (event.error) {
              setError(event.error);
              setPhase("error");
            }
          } catch {
            // Ignore parse errors for malformed SSE data
          }
        }
      }
    }

    if (hasReceivedInterrupt) {
      setPhase("review");
    }
  }

  /** Start a new brand analysis from URL */
  const startAnalysis = useCallback(async (websiteUrl: string) => {
    setPhase("streaming");
    setDraft({});
    setPlatforms({});
    setSamples([]);
    setFindings([]);
    setCurrentSubStep("");
    setError(null);
    setIsEditing(false);

    // Safety timeout — allow enough time for browser launch + crawling + LLM analysis
    streamingTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === "streaming") {
        setPhase("error");
        setError("Analysis timed out. Please try again.");
      }
    }, 300_000);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/brand-context/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: "Failed to start analysis" }));
        throw new Error(json.error ?? "Failed to start analysis");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      await processStream(reader, abortController.signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      abortControllerRef.current = null;
    }
  }, [phase]);

  /** Start a new brand analysis from a text description */
  const startAnalysisFromDescription = useCallback(async (description: string) => {
    setPhase("streaming");
    setDraft({});
    setPlatforms({});
    setSamples([]);
    setFindings([]);
    setCurrentSubStep("");
    setError(null);
    setIsEditing(false);

    // Safety timeout — allow enough time for description analysis + LLM analysis
    streamingTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === "streaming") {
        setPhase("error");
        setError("Analysis timed out. Please try again.");
      }
    }, 180_000);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/brand-context/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandDescription: description }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: "Failed to start analysis" }));
        throw new Error(json.error ?? "Failed to start analysis");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      await processStream(reader, abortController.signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("error");
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      abortControllerRef.current = null;
    }
  }, [phase]);

  /** Confirm the draft and save it, merging any inline edits first */
  const confirmDraft = useCallback(async (edits: Record<string, string> = {}) => {
    if (!threadId) return;

    setPhase("saving");
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // If there are inline edits, use save_edits action so the graph merges them before saving
    const hasEdits = Object.keys(edits).length > 0;
    const action = hasEdits ? "save_edits" : "confirm";

    try {
      const response = await fetch("/api/brand-context/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, action, edits: hasEdits ? edits : undefined }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: "Save failed" }));
        throw new Error(json.error ?? "Save failed");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      await processStream(reader, abortController.signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Save failed");
      setPhase("review");
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      abortControllerRef.current = null;
    }
  }, [threadId]);

  /** Send natural language feedback for refinement */
  const sendFeedback = useCallback(async (feedback: string) => {
    if (!threadId) return;

    setPhase("streaming");
    setFindings([]);
    setCurrentSubStep("");
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/brand-context/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, action: "feedback", feedback }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: "Feedback failed" }));
        throw new Error(json.error ?? "Feedback failed");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      await processStream(reader, abortController.signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Feedback processing failed");
      setPhase("review");
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      abortControllerRef.current = null;
    }
  }, [threadId]);

  /** Save inline edits */
  const saveInlineEdits = useCallback(async (edits: Record<string, unknown>) => {
    if (!threadId) return;

    setPhase("saving");
    setError(null);
    setIsEditing(false);
    // Merge edits into draft immediately
    setDraft((prev) => ({ ...prev, ...edits }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/brand-context/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, action: "save_edits", edits }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: "Save failed" }));
        throw new Error(json.error ?? "Save failed");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      await processStream(reader, abortController.signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Save failed");
      setPhase("review");
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      abortControllerRef.current = null;
    }
  }, [threadId]);

  const handleCancel = () => {
    abortControllerRef.current?.abort();
    setPhase("idle");
    setDraft({});
    setPlatforms({});
    setSamples([]);
    setFindings([]);
    setCurrentSubStep("");
    setError(null);
  };

  if (phase === "complete") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto size-12 text-success" weight="duotone" />
            <CardTitle className="mt-3 text-xl">Brand context saved successfully!</CardTitle>
            <CardDescription>
              Your brand voice, audience, and platform strategies are ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedSummary && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">What was created</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {savedSummary.businessName && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Brand Identity
                      </p>
                      <p className="text-foreground font-medium">{savedSummary.businessName}</p>
                    </div>
                  )}
                  {savedSummary.tonePreset && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Voice
                      </p>
                      <Badge variant="outline" className="normal-case tracking-normal">
                        {savedSummary.tonePreset}
                      </Badge>
                    </div>
                  )}
                  {savedSummary.audienceType && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Audience
                      </p>
                      <Badge variant="secondary" className="normal-case tracking-normal">
                        {savedSummary.audienceType}
                      </Badge>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Platform Strategies
                    </p>
                    <Badge variant="outline" className="normal-case tracking-normal">
                      {savedSummary.platformCount} platform{savedSummary.platformCount !== 1 ? "s" : ""} configured
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What's next? */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What&apos;s next?</CardTitle>
            <CardDescription>Start using your brand context right away.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="default"
                onClick={() => router.push("/compose")}
                className="min-h-10"
              >
                <Sparkle className="size-4 mr-2" weight="fill" />
                Try AI Compose
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/reddit/trending")}
                className="min-h-10"
              >
                <ArrowRight className="size-4 mr-2" />
                Explore trends
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/settings")}
                className="min-h-10"
              >
                <ArrowRight className="size-4 mr-2" />
                View settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <Warning className="size-4" weight="fill" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{error ?? "An unexpected error occurred."}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={handleCancel} className="min-h-10">
          Try Again
        </Button>
      </div>
    );
  }

  // Idle phase — tabbed input (URL or text description)
  if (phase === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Tell me about your brand
          </CardTitle>
          <CardDescription>
            Share your website URL or describe your brand and I&apos;ll extract your brand voice, audience, and platform strategy automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={inputMode}
            onValueChange={(v) => setInputMode(v as "url" | "text")}
            className="w-full"
          >
            <TabsList className="w-full">
              <TabsTrigger value="url" className="flex-1">
                <Globe className="size-3.5" />
                Website URL
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-1">
                <PencilSimple className="size-3.5" />
                Describe Your Brand
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="mt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (url.trim()) {
                    let normalizedUrl = url.trim();
                    if (!normalizedUrl.startsWith("http")) {
                      normalizedUrl = `https://${normalizedUrl}`;
                      setUrl(normalizedUrl);
                    }
                    startAnalysis(normalizedUrl);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="brand-url" className="text-sm font-medium">Website URL</Label>
                  <div className="flex gap-3">
                    <Input
                      id="brand-url"
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      className="min-h-10 border-border focus-within:border-brand"
                    />
                    <Button type="submit" disabled={!url.trim()} className="min-h-10">
                      <Sparkle className="size-4" weight="fill" />
                      Analyze
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1.5">
                    <Globe className="size-3.5" />
                    Website crawling
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkle className="size-3.5" weight="fill" />
                    Voice extraction
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Robot className="size-3.5" />
                    AI analysis
                  </span>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="text" className="mt-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (brandDescription.trim()) {
                    startAnalysisFromDescription(brandDescription.trim());
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="brand-description" className="text-sm font-medium">
                    Tell me about your brand
                  </Label>
                  <Textarea
                    id="brand-description"
                    placeholder={DESCRIPTION_EXAMPLE}
                    value={brandDescription}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_DESCRIPTION_CHARS) {
                        setBrandDescription(e.target.value);
                      }
                    }}
                    rows={5}
                    required
                    className="min-h-[120px] border-border focus-within:border-brand"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>What do you do? Who do you serve? What makes you unique?</span>
                    <span className={brandDescription.length > MAX_DESCRIPTION_CHARS * 0.9 ? "text-destructive" : ""}>
                      {brandDescription.length} / {MAX_DESCRIPTION_CHARS}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!brandDescription.trim() || brandDescription.length < 20}
                  className="min-h-10 w-full"
                >
                  <Sparkle className="size-4" weight="fill" />
                  Analyze My Brand
                </Button>

                <div className="flex items-center gap-6 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1.5">
                    <PencilSimple className="size-3.5" />
                    Natural language
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkle className="size-3.5" weight="fill" />
                    Voice extraction
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Robot className="size-3.5" />
                    AI analysis
                  </span>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // Streaming, review, editing, saving phases — show progress + content
  const stepIndex = getStepIndex();
  const isProcessing = phase === "streaming" || phase === "saving";

  return (
    <div className="space-y-6">
      {/* Progress tracker */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {getAnalysisSteps().map((step, idx) => {
                const isComplete = idx < stepIndex && stepIndex > 0;
                const isCurrent = idx === stepIndex;
                const StepIcon = step.icon;
                return (
                  <div key={step.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                          isComplete
                            ? "border-success bg-success text-white"
                            : isCurrent
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle className="size-5" weight="fill" />
                        ) : (
                          <StepIcon className="size-4" />
                        )}
                      </div>
                      <span
                        className={`hidden text-xs font-medium md:block ${
                          isComplete
                            ? "text-success"
                            : isCurrent
                              ? "text-primary"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < getAnalysisSteps().length - 1 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          idx < stepIndex ? "bg-success" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {isProcessing && (
              <Progress value={((stepIndex + 1) / getAnalysisSteps().length) * 100} className="h-1" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI discovery findings during streaming */}
      {findings.length > 0 && phase === "streaming" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkle className="size-4 text-brand animate-pulse" weight="fill" />
              AI Discovery
            </CardTitle>
            {currentSubStep && (
              <CardDescription className="flex items-center gap-2">
                <Spinner className="size-3 animate-spin" />
                {currentSubStep}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {findings.map((finding, idx) => (
                <div
                  key={`${finding.timestamp}-${idx}`}
                  className="rounded-lg border bg-card p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <finding.icon className="size-3 mr-1" />
                      {finding.label}
                    </Badge>
                  </div>
                  <div className="grid gap-1 text-sm">
                    {finding.fields
                      .filter((f) => f.value !== null && f.value !== "" && (!Array.isArray(f.value) || f.value.length > 0))
                      .slice(0, 4)
                      .map((field) => (
                        <div key={field.key} className="flex items-start gap-2">
                          <span className="text-muted-foreground shrink-0">{field.key}:</span>
                          <span className="text-foreground">
                            {Array.isArray(field.value) ? field.value.join(", ") : field.value}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skeleton while streaming with no findings yet */}
      {isProcessing && findings.length === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
              <Spinner className="size-4 animate-spin" />
              <span>This may take 30-60 seconds...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review card */}
      {phase === "review" && !isEditing && (
        <BrandContextReview
          draft={draft}
          platforms={platforms}
          samples={samples}
          onConfirm={confirmDraft}
          onFeedback={sendFeedback}
          onEditToggle={() => setIsEditing(true)}
          isStreaming={false}
          isSaving={false}
          connectedPlatforms={connectedPlatforms}
          accountDetails={accountDetails}
        />
      )}

      {/* Inline editing */}
      {phase === "review" && isEditing && (
        <BrandContextInlineEdit
          draft={draft}
          platforms={platforms}
          onSave={saveInlineEdits}
          onCancel={() => setIsEditing(false)}
        />
      )}

      {/* Saving indicator */}
      {phase === "saving" && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-sm">
              <Spinner className="size-5 animate-spin text-primary" />
              <span className="text-muted-foreground">Saving brand context...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel button during processing */}
      {isProcessing && (
        <Button variant="outline" onClick={handleCancel} className="min-h-10">
          Cancel
        </Button>
      )}
    </div>
  );
}
