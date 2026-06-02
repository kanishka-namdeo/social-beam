"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Spinner, Sparkle } from "@phosphor-icons/react/ssr";

const TONE_PRESETS = ["professional", "casual", "witty", "educational", "inspirational", "bold"];
const AUDIENCE_TYPES = ["B2B", "B2C", "Both"];

interface BrandQuickEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandContext: {
    id?: string;
    businessName: string | null;
    tonePreset: string | null;
    voiceDescription?: string | null;
    bannedWords?: string[];
    audienceType?: string | null;
    interests?: string[];
    trainingStatus?: string;
  };
  onSave?: () => void;
}

export function BrandQuickEditDialog({ open, onOpenChange, brandContext, onSave }: BrandQuickEditDialogProps) {
  const router = useRouter();
  const [tonePreset, setTonePreset] = useState("");
  const [voiceDescription, setVoiceDescription] = useState("");
  const [audienceType, setAudienceType] = useState("");
  const [bannedWordInput, setBannedWordInput] = useState("");
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTonePreset(brandContext.tonePreset ?? "");
      setVoiceDescription(brandContext.voiceDescription ?? "");
      setAudienceType(brandContext.audienceType ?? "");
      setBannedWords(brandContext.bannedWords ?? []);
      setInterests(brandContext.interests ?? []);
      setBannedWordInput("");
      setInterestInput("");
      setError(null);
    }
    onOpenChange(newOpen);
  };

  const addBannedWord = () => {
    const word = bannedWordInput.trim();
    if (word && !bannedWords.includes(word)) {
      setBannedWords([...bannedWords, word]);
      setBannedWordInput("");
    }
  };

  const removeBannedWord = (word: string) => {
    setBannedWords(bannedWords.filter((w) => w !== word));
  };

  const addInterest = () => {
    const tag = interestInput.trim();
    if (tag && !interests.includes(tag)) {
      setInterests([...interests, tag]);
      setInterestInput("");
    }
  };

  const removeInterest = (tag: string) => {
    setInterests(interests.filter((t) => t !== tag));
  };

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const edits: Record<string, unknown> = {};
      if (tonePreset) edits.tonePreset = tonePreset;
      if (voiceDescription) edits.voiceDescription = voiceDescription;
      if (audienceType) edits.audienceType = audienceType;
      edits.bannedWords = bannedWords;
      edits.interests = interests;

      const res = await fetch("/api/brand-context", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to save changes");
      }

      toast.success("Brand context updated", {
        description: "Changes will apply to future AI-generated content",
      });
      onOpenChange(false);
      onSave?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 tracking-tight">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Quick Edit Brand Voice
          </DialogTitle>
          <DialogDescription>
            Make small adjustments without leaving compose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tone-preset">Tone Preset</Label>
            <Select value={tonePreset} onValueChange={setTonePreset}>
              <SelectTrigger id="tone-preset">
                <SelectValue placeholder="Select a tone" />
              </SelectTrigger>
              <SelectContent>
                {TONE_PRESETS.map((tone) => (
                  <SelectItem key={tone} value={tone} className="capitalize">
                    {tone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="voice-desc">Voice Description</Label>
            <Textarea
              id="voice-desc"
              placeholder="Describe how your brand should sound..."
              value={voiceDescription}
              onChange={(e) => setVoiceDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="min-h-[80px]"
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="audience-type">Audience Type</Label>
            <Select value={audienceType} onValueChange={setAudienceType}>
              <SelectTrigger id="audience-type">
                <SelectValue placeholder="Select audience type" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="banned-word-input">Banned Words</Label>
            <div className="flex gap-2">
              <Input
                id="banned-word-input"
                placeholder="Add a banned word..."
                value={bannedWordInput}
                onChange={(e) => setBannedWordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBannedWord();
                  }
                }}
                className="min-h-10"
              />
              <Button variant="outline" size="sm" onClick={addBannedWord} type="button" className="min-h-10">
                Add
              </Button>
            </div>
            {bannedWords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {bannedWords.map((word) => (
                  <Badge key={word} variant="destructive" className="text-xs gap-1">
                    {word}
                    <button type="button" onClick={() => removeBannedWord(word)} className="ml-0.5" aria-label={`Remove ${word}`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="interest-input">Interests</Label>
            <div className="flex gap-2">
              <Input
                id="interest-input"
                placeholder="Add an interest..."
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInterest();
                  }
                }}
                className="min-h-10"
              />
              <Button variant="outline" size="sm" onClick={addInterest} type="button" className="min-h-10">
                Add
              </Button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {interests.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs gap-1">
                    {tag}
                    <button type="button" onClick={() => removeInterest(tag)} className="ml-0.5" aria-label={`Remove ${tag}`}>
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving} className="min-h-10">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="min-h-10">
              {saving ? (
                <>
                  <Spinner className="size-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
