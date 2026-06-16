"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkle, RocketLaunch, Megaphone, Users, CheckCircle, ArrowLeft, ArrowRight, Spinner, Plus } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PLATFORMS, PLATFORM_DISPLAY_NAMES } from "@/lib/oauth/platform-icons";

interface PhaseData {
  name: string;
  phase: string;
  order: number;
  description: string;
}

interface CampaignBuilderProps {
  onCreated?: () => void;
}

const STEPS = ["Basics", "Platforms", "Phases", "Review"];
const STEP_ICONS = [Sparkle, Megaphone, RocketLaunch, CheckCircle];

const ALL_PLATFORMS_LIST = [
  "linkedin",
  "x",
  "instagram",
  "facebook",
  "tiktok",
  "pinterest",
  "youtube",
  "threads",
  "googleBusiness",
  "bluesky",
];

const DURATION_OPTIONS = [
  { value: "7-day", label: "7 days" },
  { value: "14-day", label: "14 days" },
  { value: "30-day", label: "30 days" },
  { value: "custom", label: "Custom" },
];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-4">
      {STEPS.map((label, index) => {
        const Icon = STEP_ICONS[index];
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  isCompleted && "bg-primary text-primary-foreground border-primary",
                  isCurrent && "bg-brand/10 text-brand border-brand",
                  !isCompleted && !isCurrent && "bg-background text-muted-foreground border-border"
                )}
              >
                {isCompleted ? (
                  <CheckCircle className="size-4" weight="bold" />
                ) : (
                  <Icon className="size-4" weight="fill" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs hidden sm:block",
                  isCurrent && "text-foreground font-medium",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-8 sm:w-12 mx-1 mb-5 sm:mb-5 transition-colors",
                  index < currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  goal: string;
  audience: string;
  duration: string;
  phases: PhaseData[];
  isSystem: boolean;
}

export function CampaignBuilder({ onCreated }: CampaignBuilderProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Step 1: Basics
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [audience, setAudience] = useState("");
  const [duration, setDuration] = useState("7-day");

  // Step 2: Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["linkedin"]);

  // Step 3: Phases (returned from create)
  const [phases, setPhases] = useState<PhaseData[]>([]);

  // Step 4: Generation
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState("");

  // Templates
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingTemplates(true);
    fetch("/api/campaign-templates")
      .then((res) => (res.ok ? res.json() : { templates: [] }))
      .then((json) => {
        if (!cancelled) setTemplates(json.templates ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingTemplates(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  const handleSelectTemplate = (tpl: CampaignTemplate) => {
    setSelectedTemplateId(tpl.id);
    setName(tpl.name);
    setGoal(tpl.goal ?? "");
    setAudience(tpl.audience ?? "");
    if (tpl.duration) setDuration(tpl.duration);
    if (tpl.phases?.length) setPhases(tpl.phases);
  };

  const handleSelectBlank = () => {
    setSelectedTemplateId(null);
    setName("");
    setGoal("");
    setAudience("");
    setDuration("7-day");
    setPhases([]);
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const resetForm = () => {
    setStep(0);
    setName("");
    setGoal("");
    setAudience("");
    setDuration("7-day");
    setSelectedPlatforms(["linkedin"]);
    setPhases([]);
    setGenerating(false);
    setGenerationProgress(0);
    setGenerationStatus("");
    setSelectedTemplateId(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleCreateCampaign = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }

    setGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus("Creating campaign...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Step 1: Create campaign (triggers AI phase planning)
      const createRes = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: `Goal: ${goal}\nAudience: ${audience}`,
          goal: goal || undefined,
          audience: audience || undefined,
          duration,
          platforms: selectedPlatforms,
        }),
        signal: controller.signal,
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create campaign");
        setGenerating(false);
        return;
      }

      const createData = await createRes.json();
      const campaignId = createData.data?.id;

      if (!campaignId) {
        toast.error("Failed to create campaign");
        setGenerating(false);
        return;
      }

      // Step 2: Start SSE generation for post content
      setGenerationStatus("Generating campaign content...");

      const startSSEStream = async (retryCount = 0): Promise<boolean> => {
        const generateRes = await fetch(`/api/campaigns/${campaignId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platforms: selectedPlatforms, retry: retryCount > 0 }),
          signal: controller.signal,
        });

        if (!generateRes.ok) {
          toast.error("Failed to start content generation");
          return false;
        }

        const reader = generateRes.body?.getReader();
        if (!reader) {
          toast.error("Streaming not supported");
          return false;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let totalPhases = 0;
        let completedPhases = 0;
        let receivedComplete = false;
        let lastDataTime = Date.now();
        const TIMEOUT_MS = 30000;

        const processSSEEvent = (eventType: string, dataStr: string): boolean => {
          if (!eventType && !dataStr) return false;

          try {
            if (eventType === "phase_start" && dataStr) {
              totalPhases++;
              setGenerationStatus(`Starting phase ${totalPhases}...`);
            }

            if (eventType === "phase_complete" && dataStr) {
              completedPhases++;
              setGenerationProgress((completedPhases / Math.max(totalPhases, 1)) * 100);
              setGenerationStatus(`Phase ${completedPhases} complete`);
            }

            if (eventType === "platform_start" && dataStr) {
              const data = JSON.parse(dataStr);
              setGenerationStatus(`Generating for ${PLATFORM_DISPLAY_NAMES[data.platform] ?? data.platform}...`);
            }

            if (eventType === "platform_done" && dataStr) {
              const data = JSON.parse(dataStr);
              setGenerationStatus(`Done with ${PLATFORM_DISPLAY_NAMES[data.platform] ?? data.platform}`);
            }

            if (eventType === "complete" && dataStr) {
              setGenerationProgress(100);
              setGenerationStatus("Campaign ready!");
              toast.success("Campaign created successfully");
              setTimeout(() => {
                setOpen(false);
                router.push(`/campaigns/${campaignId}`);
                if (onCreated) onCreated();
              }, 500);
              return true;
            }
          } catch (parseErr) {
            console.error("SSE parse error:", parseErr, "data:", dataStr);
          }
          return false;
        };

        while (true) {
          if (Date.now() - lastDataTime > TIMEOUT_MS) {
            toast.error("Connection timeout - no data received");
            return false;
          }

          const readPromise = reader.read();
          const timeoutPromise = new Promise<{ done: boolean; value?: Uint8Array }>((_, reject) => {
            setTimeout(() => reject(new Error("READ_TIMEOUT")), TIMEOUT_MS);
          });

          let result: { done: boolean; value?: Uint8Array };
          try {
            result = await Promise.race([readPromise, timeoutPromise]);
          } catch (timeoutErr) {
            if (timeoutErr instanceof Error && timeoutErr.message === "READ_TIMEOUT") {
              toast.error("Connection timeout - no data received");
              return false;
            }
            throw timeoutErr;
          }

          const { done, value } = result;
          if (done) break;

          lastDataTime = Date.now();
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let currentEvent = "";
          let currentData: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              currentData.push(line.slice(5).trim());
            } else if (line.trim() === "") {
              if (currentEvent || currentData.length > 0) {
                const dataStr = currentData.join("\n");
                const isComplete = processSSEEvent(currentEvent, dataStr);
                if (isComplete) {
                  receivedComplete = true;
                  return true;
                }
                currentEvent = "";
                currentData = [];
              }
            }
          }
        }

        return receivedComplete;
      };

      let streamSuccess = false;
      try {
        streamSuccess = await startSSEStream(0);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("SSE stream error:", err);
      }

      if (!streamSuccess) {
        setGenerationStatus("Reconnecting...");
        try {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          streamSuccess = await startSSEStream(1);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error("SSE retry error:", err);
        }
      }

      if (!streamSuccess) {
        toast.error("Failed to generate campaign content");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Network error during generation");
    } finally {
      setGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return name.trim().length > 0;
      case 1:
        return selectedPlatforms.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs">
          <Sparkle className="size-3.5" weight="fill" />
          New Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>
            Build a multi-phase campaign with AI-generated content.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        {generating ? (
          <div className="space-y-4 py-4">
            <Progress value={generationProgress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{generationStatus}</p>
            <div className="flex justify-center">
              <Spinner className="size-6 animate-spin text-brand" weight="bold" />
            </div>
          </div>
        ) : (
          <>
            {/* Step 1: Basics */}
            {step === 0 && (
              <div className="space-y-4 py-2">
                {/* Template selection */}
                <div className="space-y-2">
                  <Label>Start from template</Label>
                  {loadingTemplates ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-44 shrink-0 rounded-sm" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      <Card
                        className={cn(
                          "shrink-0 w-44 cursor-pointer border transition-colors",
                          selectedTemplateId === null
                            ? "border-brand bg-brand/5"
                            : "border-border hover:border-brand/50"
                        )}
                        onClick={handleSelectBlank}
                      >
                        <CardContent className="flex flex-col items-center justify-center gap-2 p-4 h-full">
                          <Plus className="size-5 text-muted-foreground" />
                          <span className="text-xs font-medium text-foreground text-center">Blank campaign</span>
                        </CardContent>
                      </Card>
                      {templates.map((tpl) => (
                        <Card
                          key={tpl.id}
                          className={cn(
                            "shrink-0 w-44 cursor-pointer border transition-colors",
                            selectedTemplateId === tpl.id
                              ? "border-brand bg-brand/5"
                              : "border-border hover:border-brand/50"
                          )}
                          onClick={() => handleSelectTemplate(tpl)}
                        >
                          <CardContent className="flex flex-col gap-1 p-4 h-full">
                            <span className="text-xs font-semibold text-foreground truncate">{tpl.name}</span>
                            <span className="text-xs text-muted-foreground line-clamp-2">{tpl.description}</span>
                            <span className="text-xs text-muted-foreground mt-auto">{tpl.phases?.length ?? 0} phases</span>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g., Summer Product Launch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-goal">Goal</Label>
                  <Textarea
                    id="campaign-goal"
                    placeholder="e.g., Drive signups for our new analytics feature"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-audience">Target Audience</Label>
                  <Textarea
                    id="campaign-audience"
                    placeholder="e.g., SaaS founders and marketing leads"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Platforms */}
            {step === 1 && (
              <div className="space-y-3 py-2">
                <Label>Select Platforms</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PLATFORMS_LIST.map((platform) => {
                    const isSelected = selectedPlatforms.includes(platform);
                    return (
                      <Button
                        key={platform}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => togglePlatform(platform)}
                        className={cn(
                          "justify-start gap-2 h-10",
                          isSelected && "border-l-2 border-l-brand"
                        )}
                        aria-pressed={isSelected}
                      >
                        {PLATFORM_DISPLAY_NAMES[platform] ?? platform}
                      </Button>
                    );
                  })}
                </div>
                {selectedPlatforms.length === 0 && (
                  <p className="text-xs text-destructive">Select at least one platform</p>
                )}
              </div>
            )}

            {/* Step 3: Phases preview (shown after creation) */}
            {step === 2 && (
              <div className="space-y-3 py-2">
                <div className="rounded-sm border border-border bg-muted/30 p-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Phases will be AI-generated</p>
                  <p className="text-xs text-muted-foreground">
                    After creating the campaign, AI will generate a phased plan with content for each platform.
                  </p>
                </div>
                {phases.length > 0 && (
                  <div className="space-y-2">
                    {phases.map((phase) => (
                      <div key={phase.order} className="rounded-sm border border-border bg-card p-3">
                        <p className="text-sm font-medium text-foreground">{phase.name}</p>
                        <p className="text-xs text-muted-foreground">{phase.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Review */}
            {step === 3 && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Review Summary</h4>
                  <div className="rounded-sm border border-border bg-muted/30 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="text-foreground font-medium">{name}</span>
                    </div>
                    {goal && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Goal</span>
                        <span className="text-foreground text-right max-w-[200px] truncate">{goal}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="text-foreground">{duration}</span>
                    </div>
                    <div className="pt-1">
                      <span className="text-muted-foreground">Platforms</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPlatforms.map((p) => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {PLATFORM_DISPLAY_NAMES[p] ?? p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={step === 0 ? () => setOpen(false) : handleBack}
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="size-3.5" />
                {step === 0 ? "Cancel" : "Back"}
              </Button>

              {step === 3 ? (
                <Button
                  size="sm"
                  onClick={handleCreateCampaign}
                  disabled={generating}
                  className="gap-1.5 text-xs"
                >
                  <Sparkle className="size-3.5" weight="fill" />
                  Generate Campaign
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="gap-1.5 text-xs"
                >
                  Next
                  <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
