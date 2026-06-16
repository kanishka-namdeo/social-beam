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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { BrandResumePrompt } from "./brand-resume-prompt";

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
  errorCode?: string;
  suggestion?: string;
  heartbeat?: boolean;
  elapsedMs?: number;
  resumed?: boolean;
  checkpointStep?: string;
  nextNode?: string;
  content_summary?: { pagesFound: string[]; pageCount: number };
  identity_extracted?: { businessName: string | null; tagline: string | null; industry: string | null };
  voice_extracted?: { tonePreset: string | null; voiceDescription: string | null };
  audience_extracted?: { audienceType: string | null; interests: string[]; painPoints: string[] };
  platform_ready?: { platform: string; tonePreset: string | null; contentStyle: string | null };
  crawl_progress?: { pages: string[]; totalPages: number };
}

type Phase = "idle" | "streaming" | "review" | "editing" | "saving" | "complete" | "error" | "resume_prompt";

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

/** Check if a string looks like a valid URL (minimal heuristic). */
function isValidUrlFormat(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  return trimmed.includes(".") && trimmed.length >= 4;
}

interface BrandConversationalUIProps {
  initialUrl?: string;
  isReanalyzeMode?: boolean;
  connectedPlatforms?: string[];
}

export function BrandConversationalUI({ initialUrl, isReanalyzeMode, connectedPlatforms: initialConnectedPlatforms = [] }: BrandConversationalUIProps) {
  const router = useRouter();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [inputMode, setInputMode] = useState<"url" | "text">("url");
  const [brandDescription, setBrandDescription] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState("collect");
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [platforms, setPlatforms] = useState<Record<string, unknown>>({});
  const [samples, setSamples] = useState<Array<{ platform: string; content: string }>>([]);
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>(initialConnectedPlatforms);
  const [accountDetails, setAccountDetails] = useState<Record<string, { platformUsername?: string; followerCount?: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [currentSubStep, setCurrentSubStep] = useState("");
  const [savedSummary, setSavedSummary] = useState<{
    businessName?: string;
    tonePreset?: string;
    audienceType?: string;
    platformCount: number;
  } | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);
  const [crawledPages, setCrawledPages] = useState<string[]>([]);
  const [errorSuggestion, setErrorSuggestion] = useState<string | null>(null);
  const [lastHeartbeatMs, setLastHeartbeatMs] = useState(0);
  const [resumeDraft, setResumeDraft] = useState<{
    checkpointStep: string;
    createdAt: string;
    inputUrl?: string | null;
    inputDescription?: string | null;
    partialSummary: string;
    hasBrandContextDraft: boolean;
    hasPlatformContextsDraft: boolean;
    hasSamplePosts: boolean;
  } | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const mountedRef = useRef(true);

  // Track elapsed time from heartbeats
  React.useEffect(() => {
    if (phase !== "streaming" || lastHeartbeatMs === 0) return;
    const interval = setInterval(() => {
      setStreamProgress((prev) => {
        if (prev >= 95) return 95;
        return Math.min(prev + 1, 95);
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [phase, lastHeartbeatMs]);

  // Keep phaseRef in sync with current phase for timeout callbacks
  React.useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Slow progress animation during initial streaming (before any findings arrive)
  React.useEffect(() => {
    if (phase !== "streaming" || findings.length > 0) return;

    const interval = setInterval(() => {
      setStreamProgress((prev) => {
        if (prev >= 90) return 90; // Cap at 90% until real progress arrives
        return Math.min(prev + 1, 90);
      });
    }, 600); // ~54 seconds to reach 90%

    return () => clearInterval(interval);
  }, [phase, findings.length]);

  // Cleanup all timers and abort streams on unmount
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  // Check for existing draft on mount
  const draftCheckDone = useRef(false);

  React.useEffect(() => {
    if (phase !== "idle" || draftCheckDone.current || isReanalyzeMode) return;
    draftCheckDone.current = true;

    (async () => {
      try {
        const response = await fetch("/api/brand-context/resume-draft", {
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.hasDraft) {
            setResumeDraft(data.draft);
            setPhase("resume_prompt");
          }
        }
      } catch {
        // Draft check failure is non-critical — stay in idle phase
      }
    })();
  }, [phase, isReanalyzeMode]);

  // Auto-start analysis in re-analyze mode
  const autoStartTriggered = React.useRef(false);

  // Phase 1: set initial state for re-analyze (before paint)
  React.useLayoutEffect(() => {
    if (isReanalyzeMode && initialUrl && !autoStartTriggered.current) {
      autoStartTriggered.current = true;
      setUrl(initialUrl);
    }
  }, [isReanalyzeMode, initialUrl]);

  // Phase 2: start the analysis after the state updates (deferred setState is OK)
  React.useEffect(() => {
    if (!autoStartTriggered.current || !initialUrl) return;
    if (phase !== "idle") return;

    // Create the abort controller eagerly so cleanup can always reach it,
    // even if the outer deferred setTimeout hasn't fired yet.
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Defer setState via microtask to avoid cascading render warning
    const id = setTimeout(() => {
      setPhase("streaming");
      setDraft({});
      setPlatforms({});
      setSamples([]);
      setFindings([]);
      setCurrentSubStep("");
      setError(null);
    setStreamProgress(0);

    streamingTimeoutRef.current = setTimeout(() => {
        if (phaseRef.current === "streaming") {
          setPhase("error");
          setError("Analysis timed out. Please try again.");
        }
      }, 300_000);

      void (async () => {
        try {
          const response = await fetch("/api/brand-context/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ websiteUrl: initialUrl }),
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
          if (mountedRef.current && err instanceof Error && err.name !== "AbortError") {
            setError(err instanceof Error ? err.message : "Something went wrong");
            setPhase("error");
          }
        } finally {
          if (streamingTimeoutRef.current) {
            clearTimeout(streamingTimeoutRef.current);
          }
          abortControllerRef.current = null;
        }
      })();
    }, 0);

    return () => {
      clearTimeout(id);
      // Abort any in-flight stream and clear the safety timeout so a dep
      // change while streaming doesn't leak the connection.
      abortController.abort();
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
      abortControllerRef.current = null;
    };
  }, [isReanalyzeMode, initialUrl, phase]);

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

  /** Build the elapsed time display from heartbeat */
  function getElapsedTimeDisplay(): string | null {
    if (lastHeartbeatMs === 0) return null;
    const seconds = Math.round(lastHeartbeatMs / 1000);
    if (seconds < 60) return `(${seconds}s elapsed)`;
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `(${minutes}m ${remaining}s elapsed)`;
  }

  /** Process an SSE stream and accumulate state */
  async function processStream(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    signal: AbortSignal,
  ): Promise<void> {
    const decoder = new TextDecoder();
    let hasReceivedInterrupt = false;
    let hasReceivedError = false;
    let hasReceivedSaved = false;
    // Track draft locally — React state is async and stale in closures
    let localDraft: Record<string, unknown> = {};
    let localPlatforms: Record<string, unknown> = {};
    let localSamples: Array<{ platform: string; content: string }> = [];

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

            // Heartbeat: track elapsed time to show progress
            if (event.heartbeat && event.elapsedMs !== undefined) {
              setLastHeartbeatMs(event.elapsedMs);
            }

            // Resume event: show feedback that we're resuming from a checkpoint
            if (event.resumed && event.checkpointStep) {
              setCurrentSubStep(`Resuming from ${event.checkpointStep.replace(/_/g, " ")}...`);
            }

            if (event.step) {
              setCurrentStep(event.step);
              updateSubStep(event.step);
            }

            // Per-page crawl progress
            if (event.crawl_progress) {
              setCrawledPages(event.crawl_progress.pages);
            }

            // Process granular findings (capped to prevent unbounded growth)
            const finding = extractFinding(event);
            if (finding) {
              setFindings((prev) => prev.length >= 100 ? prev : [...prev, finding]);
            }

            if (event.draft) {
              localDraft = { ...localDraft, ...event.draft };
              setDraft((prev) => ({ ...prev, ...event.draft }));
            }
            if (event.platforms) {
              localPlatforms = event.platforms;
              setPlatforms(event.platforms as Record<string, unknown>);
            }
            if (event.samples) {
              localSamples = event.samples;
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
              if (event.draft) {
                localDraft = event.draft;
                setDraft(event.draft);
              }
              if (event.platforms) {
                localPlatforms = event.platforms;
                setPlatforms(event.platforms);
              }
              if (event.samples) {
                localSamples = event.samples;
                setSamples(event.samples);
              }
              if (event.connectedPlatforms) setConnectedPlatforms(event.connectedPlatforms);
              if (event.accountDetails) setAccountDetails(event.accountDetails);
            }
            if (event.saved) {
              hasReceivedSaved = true;
              console.log("[brand-debug] processStream: received saved event", {
                localDraftKeys: Object.keys(localDraft),
                localPlatformsKeys: Object.keys(localPlatforms),
                localSamplesCount: localSamples.length,
                hasDraftState: Object.keys(draft).length > 0,
              });
              // Use localDraft if available (from original stream), fall back to React state
              const effectiveDraft = Object.keys(localDraft).length > 0 ? localDraft : draft;
              const businessName = typeof effectiveDraft.businessName === "string" ? effectiveDraft.businessName : undefined;
              const tonePreset = typeof effectiveDraft.tonePreset === "string" ? effectiveDraft.tonePreset : undefined;
              const audienceType = typeof effectiveDraft.audienceType === "string" ? effectiveDraft.audienceType : undefined;
              const effectivePlatforms = Object.keys(localPlatforms).length > 0 ? localPlatforms : platforms;
              const platformCount = Object.keys(effectivePlatforms).length;
              setSavedSummary({ businessName, tonePreset, audienceType, platformCount });
              setPhase("complete");
            }
            if (event.done && event.threadId) {
              setThreadId(event.threadId);
            }
            if (event.error) {
              hasReceivedError = true;
              setError(event.error);
              setErrorSuggestion(event.suggestion ?? null);
              setPhase("error");
            }
          } catch {
            // Ignore parse errors for malformed SSE data
          }
        }
      }
    }

    console.log("[brand-debug] processStream: stream ended", { hasReceivedInterrupt, hasReceivedError, hasReceivedSaved, phaseRef: phaseRef.current, localDraftKeys: Object.keys(localDraft).length });
    if (!mountedRef.current) return;
    if (hasReceivedSaved) {
      // Save already completed — phase is already "complete"
    } else if (hasReceivedInterrupt) {
      setPhase("review");
    } else if (Object.keys(localDraft).length > 0) {
      // Server reached review step with data but didn't send interrupt (e.g., description-based analysis)
      setPhase("review");
    } else if (hasReceivedError) {
      // Error was already handled during stream processing, don't overwrite it
      // Phase is already set to "error" and error message is already set
    } else if (phaseRef.current === "streaming") {
      // Stream ended without interrupt, save, or draft data — something went wrong silently
      setPhase("error");
      setError("Analysis completed without results. Try again or describe your brand manually.");
    }
  }

  /** Start a new brand analysis from URL */
  const startAnalysisFromUrl = useCallback(async (websiteUrl: string) => {
    setPhase("streaming");
    // Discard any existing draft when starting fresh
    fetch("/api/brand-context/draft", { method: "DELETE" }).catch(() => {});
    setDraft({});
    setPlatforms({});
    setSamples([]);
    setFindings([]);
    setCurrentSubStep("");
    setError(null);
    setStreamProgress(0);

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
    // Discard any existing draft when starting fresh
    fetch("/api/brand-context/draft", { method: "DELETE" }).catch(() => {});
    setDraft({});
    setPlatforms({});
    setSamples([]);
    setFindings([]);
    setCurrentSubStep("");
    setError(null);
    setStreamProgress(0);

    // Safety timeout — allow enough time for description analysis + LLM analysis
    streamingTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === "streaming") {
        setPhase("error");
        setError("Analysis timed out. Please try again.");
      }
    }, 360_000);

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

  const handleResume = useCallback(async () => {
    if (!resumeDraft) return;

    setIsResuming(true);
    setPhase("streaming");
    setDraft({});
    setPlatforms({});
    setSamples([]);
    setFindings([]);
    setCurrentSubStep("");
    setError(null);
    setStreamProgress(0);

    streamingTimeoutRef.current = setTimeout(() => {
      if (phaseRef.current === "streaming") {
        setPhase("error");
        setError("Resume analysis timed out. Please try again.");
      }
    }, 360_000);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/brand-context/resume-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({ error: "Resume failed" }));
        throw new Error(json.error ?? "Resume failed");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No readable stream");
      }

      await processStream(reader, abortController.signal);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Resume failed");
      setPhase("resume_prompt");
      setIsResuming(false);
    } finally {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      abortControllerRef.current = null;
    }
  }, [resumeDraft]);

  const handleDiscardDraft = useCallback(async () => {
    try {
      await fetch("/api/brand-context/draft", { method: "DELETE" });
    } catch {
      // Discard failure is non-critical
    }
    setResumeDraft(null);
    setPhase("idle");
    setIsResuming(false);
  }, []);

  /** Confirm the draft and save it, merging any inline edits first */
  const confirmDraft = useCallback(async (edits: Record<string, unknown> = {}) => {
    console.log("[brand-debug] confirmDraft called", { hasThreadId: !!threadId, threadId, editKeys: Object.keys(edits), phase });
    if (!threadId) {
      console.error("[brand-debug] confirmDraft: threadId is null/undefined, bailing out silently!");
      setError("Cannot save: no active session. Please restart the analysis.");
      setPhase("review");
      return;
    }

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

  const handleCancel = () => {
    // Show confirmation if there are findings (user has invested time)
    if (findings.length > 0) {
      setShowCancelConfirm(true);
    } else {
      forceCancel();
    }
  };

  const forceCancel = useCallback(async () => {
    setShowCancelConfirm(false);
    abortControllerRef.current?.abort();

    // Call cancel endpoint to stop crawler and clean up
    if (threadId) {
      try {
        await fetch("/api/brand-context/cancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId }),
        });
      } catch {
        // Cancel endpoint failure is non-critical
      }
    }

    setPhase("idle");
    setDraft({});
    setPlatforms({});
    setSamples([]);
    setFindings([]);
    setCrawledPages([]);
    setCurrentSubStep("");
    setError(null);
    setErrorSuggestion(null);
    setLastHeartbeatMs(0);
    setStreamProgress(0);
  }, [threadId]);

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
              <div className="rounded-sm border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">What was created</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  {savedSummary.businessName && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                        Brand Identity
                      </p>
                      <p className="text-foreground font-medium">{savedSummary.businessName}</p>
                    </div>
                  )}
                  {savedSummary.tonePreset && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                        Voice
                      </p>
                      <Badge variant="outline" className="normal-case tracking-normal">
                        {savedSummary.tonePreset}
                      </Badge>
                    </div>
                  )}
                  {savedSummary.audienceType && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                        Audience
                      </p>
                      <Badge variant="secondary" className="normal-case tracking-normal">
                        {savedSummary.audienceType}
                      </Badge>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
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
    const isCrawlError = errorSuggestion?.includes("describing your brand") || errorSuggestion?.includes("Describe your brand");
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <Warning className="size-4" weight="fill" />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error ?? "An unexpected error occurred."}</p>
            {errorSuggestion && (
              <p className="text-sm text-muted-foreground">{errorSuggestion}</p>
            )}
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleCancel} className="min-h-10">
            Try Again
          </Button>
          {isCrawlError && (
            <Button
              variant="default"
              onClick={() => {
                setPhase("idle");
                setInputMode("text");
                setError(null);
                setErrorSuggestion(null);
              }}
              className="min-h-10"
            >
              <PencilSimple className="size-4 mr-2" />
              Describe brand instead
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Resume prompt phase
  if (phase === "resume_prompt" && resumeDraft) {
    return (
      <BrandResumePrompt
        draft={resumeDraft}
        onResume={handleResume}
        onDiscard={handleDiscardDraft}
        isResuming={isResuming}
      />
    );
  }

  // Idle phase — tabbed input (URL or text description)
  if (phase === "idle") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            {isReanalyzeMode ? "Re-analyzing your brand" : "Tell me about your brand"}
          </CardTitle>
          <CardDescription>
            {isReanalyzeMode
              ? "I'll crawl your site again and update your brand voice, audience, and platform strategy."
              : "Share your website URL or describe your brand and I'll extract your brand voice, audience, and platform strategy automatically."}
          </CardDescription>
        </CardHeader>
        {connectedPlatforms.length > 0 && !isReanalyzeMode && (
          <div className="mx-6 mb-4 rounded-sm border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">I&apos;ll also analyze your existing posts on </span>
            {connectedPlatforms.map((p, i) => (
              <span key={p} className="capitalize text-foreground">
                {p}{i < connectedPlatforms.length - 1 ? (i === connectedPlatforms.length - 2 ? " and " : ", ") : ""}
              </span>
            ))}
            <span> to improve voice accuracy.</span>
          </div>
        )}
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
                    startAnalysisFromUrl(normalizedUrl);
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
                      onBlur={() => {
                        if (url.trim() && !url.trim().startsWith("http://") && !url.trim().startsWith("https://")) {
                          setUrl(`https://${url.trim()}`);
                        }
                      }}
                      required
                      className="min-h-10 border-border focus-within:border-brand"
                    />
                    <Button type="submit" disabled={!url.trim() || !isValidUrlFormat(url.trim())} className="min-h-10">
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
                        className={`flex h-10 w-10 items-center justify-center rounded-sm border-strong transition-colors ${
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
                  className="rounded-sm border bg-card p-3 space-y-2 animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      <finding.icon className="size-3 mr-1" />
                      {finding.label}
                    </Badge>
                    <span className="text-micro text-muted-foreground tabular-nums ml-auto">
                      {new Date(finding.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="grid-auto-fill gap-1 text-sm">
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
            {currentStep === "collect" && crawledPages.length > 0 ? (
              // Show real-time crawl progress
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4 animate-spin" />
                  <span>Crawling website pages... {crawledPages.length} page{crawledPages.length !== 1 ? "s" : ""} analyzed</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {crawledPages.map((page) => (
                    <Badge key={page} variant="secondary" className="text-xs">
                      {page}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                  <Spinner className="size-4 animate-spin" />
                  <span>
                    {currentSubStep || "Analyzing your brand across multiple pages"}
                    {getElapsedTimeDisplay() && ` ${getElapsedTimeDisplay()}`}
                  </span>
                </div>
              </>
            )}
            <Progress value={streamProgress} className="h-1" />
          </CardContent>
        </Card>
      )}

      {/* Crawl progress during findings */}
      {currentStep === "collect" && crawledPages.length > 0 && findings.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground mb-2">Pages crawled: {crawledPages.length}</div>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {crawledPages.map((page) => (
                <Badge key={page} variant="secondary" className="text-xs">
                  {page}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review card */}
      {(phase === "review" || phase === "saving") && (
        <BrandContextReview
          draft={draft}
          platforms={platforms}
          samples={samples}
          onConfirm={confirmDraft}
          onFeedback={sendFeedback}
          isStreaming={false}
          isSaving={phase === "saving"}
          connectedPlatforms={connectedPlatforms}
          accountDetails={accountDetails}
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
          Cancel analysis
        </Button>
      )}

      {/* Cancel confirmation dialog */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel brand analysis?</DialogTitle>
            <DialogDescription>
              {findings.length > 0
                ? `I've already found ${findings.length} insight${findings.length > 1 ? "s" : ""}. Canceling will discard all progress.`
                : "This will discard the current analysis. You can start a new one anytime."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>
              Keep going
            </Button>
            <Button variant="destructive" onClick={forceCancel}>
              Cancel anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
