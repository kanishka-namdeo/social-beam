"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  ChatCircle,
  Lightning,
  GraduationCap,
  Sparkle,
  Megaphone,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { toast } from "sonner";

interface BrandVoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  stepNumber: number;
  totalSteps: number;
}

interface TonePreset {
  id: string;
  label: string;
  description: string;
  icon: Icon;
}

const TONE_PRESETS: TonePreset[] = [
  { id: "professional", label: "Professional", description: "Polished, authoritative", icon: Briefcase },
  { id: "casual", label: "Casual", description: "Friendly, conversational", icon: ChatCircle },
  { id: "witty", label: "Witty", description: "Clever, humorous", icon: Lightning },
  { id: "educational", label: "Educational", description: "Informative, clear", icon: GraduationCap },
  { id: "inspirational", label: "Inspirational", description: "Motivating, uplifting", icon: Sparkle },
  { id: "bold", label: "Bold", description: "Confident, direct", icon: Megaphone },
];

export function BrandVoiceDialog({
  open,
  onOpenChange,
  onComplete,
  stepNumber,
  totalSteps,
}: BrandVoiceDialogProps) {
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [voiceDescription, setVoiceDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!selectedTone) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "brand_voice",
          data: {
            tonePreset: selectedTone,
            description: voiceDescription.trim(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save brand voice");
      }

      toast.success("Brand voice saved successfully");
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save brand voice");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">
            Step {stepNumber} of {totalSteps}
          </div>
          <DialogTitle>Define your brand voice</DialogTitle>
          <DialogDescription>
            Choose a tone that best represents how your brand communicates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TONE_PRESETS.map((preset) => {
              const IconComponent = preset.icon;
              const isSelected = selectedTone === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedTone(preset.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:bg-accent/50",
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border"
                  )}
                >
                  <IconComponent
                    size={24}
                    className={cn(
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="text-sm font-medium">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {preset.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label htmlFor="voice-description" className="text-sm font-medium">
              Voice Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="voice-description"
              value={voiceDescription}
              onChange={(e) => setVoiceDescription(e.target.value)}
              placeholder="Describe your brand's unique voice..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedTone || isSaving}
          >
            {isSaving ? "Saving..." : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
