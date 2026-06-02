"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { BrandContextInlineEdit } from "./brand-context-inline-edit";
import { BrandContextHistory } from "./brand-context-history";
import { BrandContextImportExport } from "./brand-context-import-export";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkle,
  Users,
  Target,
  Megaphone,
  CheckCircle,
  Warning,
  Clock,
  Trash,
  ArrowCounterClockwise,
  Globe,
  PencilSimple,
  Camera,
} from "@phosphor-icons/react/ssr";

interface PlatformContext {
  id: string;
  platform: string;
  platformTone: string | null;
  postingCadence: string | null;
  visualStyle: string | null;
  engagementStyle: string | null;
  contentMix: unknown;
  hashtagStrategy: unknown;
  platformRules: string[];
}

interface BrandContextData {
  id: string;
  workspaceId: string;
  businessName: string | null;
  tagline: string | null;
  websiteUrl: string | null;
  industry: string | null;
  productDesc: string | null;
  tonePreset: string | null;
  voiceDescription: string | null;
  bannedWords: string[];
  audienceType: string | null;
  demographics: unknown;
  interests: string[];
  painPoints: string[];
  competitors: string[];
  goals: string[];
  trainingStatus: string;
  lastTrainedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  PlatformContext: PlatformContext[];
}

interface BrandContextCardProps {
  brandContext: BrandContextData;
}

const statusBadgeConfig: Record<string, { variant: "default" | "secondary" | "outline"; icon: React.ReactNode; label: string; className: string }> = {
  trained: {
    variant: "default",
    icon: <CheckCircle className="size-3" weight="fill" />,
    label: "Trained",
    className: "bg-success/10 text-success border-success/20",
  },
  needs_refresh: {
    variant: "outline",
    icon: <Warning className="size-3" weight="fill" />,
    label: "Needs Refresh",
    className: "bg-warning/10 text-warning border-warning/20",
  },
  untrained: {
    variant: "secondary",
    icon: <Clock className="size-3" />,
    label: "Untrained",
    className: "bg-muted text-muted-foreground",
  },
};

export function BrandContextCard({ brandContext }: BrandContextCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [checkpointDialogOpen, setCheckpointDialogOpen] = useState(false);
  const [checkpointReason, setCheckpointReason] = useState("");

  const status = brandContext.trainingStatus;
  const badgeConfig = statusBadgeConfig[status] ?? statusBadgeConfig.untrained;

  async function handleDelete() {
    if (!confirm("Delete brand context? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-context", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to delete brand context.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdits(edits: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-context", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to save edits.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleReanalyze() {
    router.push(`/settings/brand?mode=reanalyze&url=${encodeURIComponent(brandContext.websiteUrl ?? "")}`);
  }

  async function handleCreateCheckpoint() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/brand-context/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeReason: checkpointReason || "manual_checkpoint" }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to create checkpoint.");
        return;
      }
      toast.success("Checkpoint created", {
        description: "A snapshot of your current brand context has been saved.",
      });
      setCheckpointDialogOpen(false);
      setCheckpointReason("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <BrandContextInlineEdit
        draft={brandContext as unknown as Record<string, unknown>}
        platforms={Object.fromEntries(brandContext.PlatformContext.map((pc) => [pc.platform, pc]))}
        onSave={handleSaveEdits}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="rounded-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2 tracking-tight">
                <Sparkle className="size-5 text-brand" weight="fill" />
                Brand Identity
              </CardTitle>
              <CardDescription>
                Core brand profile extracted from your website.
              </CardDescription>
            </div>
            <Badge variant={badgeConfig.variant} className={cn(badgeConfig.className)}>
              {badgeConfig.icon}
              {badgeConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {brandContext.businessName && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Business Name
                </p>
                <p className="text-sm font-medium text-foreground">
                  {brandContext.businessName}
                </p>
              </div>
            )}
            {brandContext.industry && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Industry
                </p>
                <p className="text-sm text-foreground">
                  {brandContext.industry}
                </p>
              </div>
            )}
            {brandContext.tagline && (
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Tagline
                </p>
                <p className="text-sm text-foreground">
                  {brandContext.tagline}
                </p>
              </div>
            )}
            {brandContext.websiteUrl && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                  Website
                </p>
                <a
                  href={brandContext.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-brand hover:underline"
                >
                  {brandContext.websiteUrl}
                </a>
              </div>
            )}
          </div>

          {brandContext.lastTrainedAt && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              Last trained {new Date(brandContext.lastTrainedAt).toLocaleString()}
            </div>
          )}

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleReanalyze}
              disabled={saving}
              className="rounded-sm min-h-10"
            >
              <ArrowCounterClockwise className="size-4" />
              Re-analyze
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              disabled={saving}
              className="rounded-sm min-h-10"
            >
              <PencilSimple className="size-4" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => setCheckpointDialogOpen(true)}
              disabled={saving}
              className="rounded-sm min-h-10"
            >
              <Camera className="size-4" />
              Checkpoint
            </Button>
            <BrandContextImportExport brandContext={{ id: brandContext.id, businessName: brandContext.businessName }} />
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || saving}
              className="rounded-sm min-h-10"
            >
              <Trash className="size-4" />
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Competitors section */}
      {brandContext.competitors.length > 0 && (
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 tracking-tight">
              <Target className="size-5 text-brand" weight="fill" />
              Competitors
            </CardTitle>
            <CardDescription>
              Competitor accounts to monitor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {brandContext.competitors.map((competitor) => (
                <Badge
                  key={competitor}
                  variant="outline"
                  className="text-xs normal-case tracking-normal"
                >
                  {competitor}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice section */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Megaphone className="size-5 text-brand" weight="fill" />
            Voice &amp; Tone
          </CardTitle>
          <CardDescription>
            How your brand communicates across platforms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brandContext.tonePreset && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                Tone Preset
              </p>
              <Badge variant="outline" className="normal-case tracking-normal">
                {brandContext.tonePreset}
              </Badge>
            </div>
          )}
          {brandContext.voiceDescription && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                Voice Description
              </p>
              <p className="text-sm text-foreground">
                {brandContext.voiceDescription}
              </p>
            </div>
          )}
          {brandContext.bannedWords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                Banned Words
              </p>
              <div className="flex flex-wrap gap-1.5">
                {brandContext.bannedWords.map((word) => (
                  <Badge
                    key={word}
                    variant="destructive"
                    className="text-xs normal-case tracking-normal"
                  >
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audience section */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 tracking-tight">
            <Users className="size-5 text-brand" weight="fill" />
            Audience
          </CardTitle>
          <CardDescription>
            Target audience profile and interests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {brandContext.audienceType && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                Audience Type
              </p>
              <Badge variant="outline" className="normal-case tracking-normal">
                {brandContext.audienceType}
              </Badge>
            </div>
          )}
          {brandContext.interests.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                Interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {brandContext.interests.map((interest) => (
                  <Badge
                    key={interest}
                    variant="secondary"
                    className="text-xs normal-case tracking-normal"
                  >
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {brandContext.painPoints.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                Pain Points
              </p>
              <div className="flex flex-wrap gap-1.5">
                {brandContext.painPoints.map((point) => (
                  <Badge
                    key={point}
                    variant="outline"
                    className="text-xs normal-case tracking-normal"
                  >
                    {point}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goals section */}
      {brandContext.goals.length > 0 && (
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 tracking-tight">
              <Target className="size-5 text-brand" weight="fill" />
              Goals
            </CardTitle>
            <CardDescription>
              Brand objectives and content strategy targets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {brandContext.goals.map((goal) => (
                <Badge
                  key={goal}
                  variant="outline"
                  className="text-xs normal-case tracking-normal"
                >
                  {goal}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Platform contexts */}
      {brandContext.PlatformContext.length > 0 && (
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 tracking-tight">
              <Globe className="size-5 text-brand" weight="fill" />
              Platform Contexts
            </CardTitle>
            <CardDescription>
              Platform-specific tone, cadence, and content strategy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {brandContext.PlatformContext.map((pc) => (
                <AccordionItem key={pc.id} value={pc.platform}>
                  <AccordionTrigger className="text-sm font-medium capitalize">
                    {pc.platform}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {pc.platformTone && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                            Tone
                          </p>
                          <Badge variant="outline" className="normal-case tracking-normal">
                            {pc.platformTone}
                          </Badge>
                        </div>
                      )}
                      {pc.postingCadence && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                            Cadence
                          </p>
                          <p className="text-sm text-foreground">
                            {pc.postingCadence}
                          </p>
                        </div>
                      )}
                      {pc.visualStyle && (
                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                            Visual Style
                          </p>
                          <p className="text-sm text-foreground">
                            {pc.visualStyle}
                          </p>
                        </div>
                      )}
                      {pc.engagementStyle && (
                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                            Engagement Style
                          </p>
                          <p className="text-sm text-foreground">
                            {pc.engagementStyle}
                          </p>
                        </div>
                      )}
                      {pc.platformRules.length > 0 && (
                        <div className="space-y-2 sm:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-tight text-muted-foreground">
                            Platform Rules
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {pc.platformRules.map((rule, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs normal-case tracking-normal"
                              >
                                {rule}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <BrandContextHistory />

      {/* Checkpoint Dialog */}
      <Dialog open={checkpointDialogOpen} onOpenChange={setCheckpointDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="size-5 text-brand" weight="fill" />
              Create Version Checkpoint
            </DialogTitle>
            <DialogDescription>
              Save a snapshot of your current brand context for future reference.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="checkpoint-reason">Reason (optional)</Label>
            <Textarea
              id="checkpoint-reason"
              placeholder="e.g., Before Q2 campaign launch"
              value={checkpointReason}
              onChange={(e) => setCheckpointReason(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCheckpointDialogOpen(false); setCheckpointReason(""); }}>Cancel</Button>
            <Button onClick={handleCreateCheckpoint} disabled={saving}>
              {saving ? (
                <>
                  <Clock className="size-4 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                <>
                  <Camera className="size-4 mr-1.5" weight="fill" />
                  Create Checkpoint
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <Alert variant="destructive">
          <Warning className="size-4" weight="fill" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
