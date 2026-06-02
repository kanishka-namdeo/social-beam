"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkle,
  Megaphone,
  Users,
  Target,
  Globe,
  Plus,
  X,
  CheckCircle,
  PencilSimple,
} from "@phosphor-icons/react/ssr";

const TONE_OPTIONS = [
  "professional",
  "casual",
  "witty",
  "educational",
  "inspirational",
  "bold",
];

const AUDIENCE_OPTIONS = ["b2b", "b2c", "both"];

const GOAL_OPTIONS = [
  "awareness",
  "leads",
  "sales",
  "community",
  "thought_leadership",
];

const INDUSTRY_OPTIONS = [
  "marketing",
  "fitness",
  "saas",
  "ecommerce",
  "education",
  "finance",
  "healthcare",
  "technology",
  "media",
  "food & beverage",
  "real estate",
  "nonprofit",
];

interface BrandContextInlineEditProps {
  draft: Record<string, unknown>;
  platforms: Record<string, unknown>;
  onSave: (edits: Record<string, unknown>) => void;
  onCancel: () => void;
}

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
}: {
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setInput("");
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add and press Enter"
          className="rounded-sm min-h-10 border-border focus-within:border-brand"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!input.trim()}
          className="rounded-sm min-h-10"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-xs normal-case tracking-normal">
              {tag}
              <button
                onClick={() => onRemove(tag)}
                className="ml-0.5 hover:text-destructive"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandContextInlineEdit({
  draft,
  platforms,
  onSave,
  onCancel,
}: BrandContextInlineEditProps) {
  const [edits, setEdits] = useState<Record<string, unknown>>({ ...draft });

  function setField(key: string, value: unknown) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave(edits);
  }

  const platformEntries = Object.entries(platforms) as [string, unknown][];

  return (
    <Card className="border-brand/20 rounded-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2 tracking-tight">
              <PencilSimple className="size-5 text-brand" weight="fill" />
              Edit Brand Context
            </CardTitle>
            <CardDescription>
              Adjust any field below. Changes merge with the current draft.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="min-h-9"
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkle className="size-4 text-brand" weight="fill" />
            <h3 className="text-sm font-semibold">Identity</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-businessName" className="text-sm font-medium">Brand Name</Label>
                <Input
                  id="edit-businessName"
                  value={(edits.businessName as string) ?? ""}
                  onChange={(e) => setField("businessName", e.target.value)}
                  className="rounded-sm min-h-10 border-border focus-within:border-brand"
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tagline" className="text-sm font-medium">Tagline</Label>
                <Input
                  id="edit-tagline"
                  value={(edits.tagline as string) ?? ""}
                  onChange={(e) => setField("tagline", e.target.value)}
                  className="rounded-sm min-h-10 border-border focus-within:border-brand"
                />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-industry" className="text-sm font-medium">Industry</Label>
              <Select
                value={(edits.industry as string) ?? ""}
                onValueChange={(v) => setField("industry", v)}
              >
                <SelectTrigger id="edit-industry" className="rounded-sm min-h-10 border-border focus-within:border-brand">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-websiteUrl" className="text-sm font-medium">Website URL</Label>
              <Input
                id="edit-websiteUrl"
                type="url"
                value={(edits.websiteUrl as string) ?? ""}
                onChange={(e) => setField("websiteUrl", e.target.value)}
                className="rounded-sm min-h-10 border-border focus-within:border-brand"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-productDesc" className="text-sm font-medium">What You Do</Label>
            <Textarea
              id="edit-productDesc"
              value={(edits.productDesc as string) ?? ""}
              onChange={(e) => setField("productDesc", e.target.value)}
              className="rounded-sm min-h-10 resize-none border-border focus-within:border-brand"
              rows={3}
            />
          </div>
        </div>

        <Separator />

        {/* Voice */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-brand" weight="fill" />
            <h3 className="text-sm font-semibold">Voice &amp; Tone</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-tonePreset" className="text-sm font-medium">Tone</Label>
              <Select
                value={(edits.tonePreset as string) ?? ""}
                onValueChange={(v) => setField("tonePreset", v)}
              >
                <SelectTrigger id="edit-tonePreset" className="rounded-sm min-h-10 border-border focus-within:border-brand">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-voiceDescription" className="text-sm font-medium">Voice Description</Label>
            <Textarea
              id="edit-voiceDescription"
              value={(edits.voiceDescription as string) ?? ""}
              onChange={(e) => setField("voiceDescription", e.target.value)}
              className="rounded-sm min-h-10 resize-none border-border focus-within:border-brand"
              rows={3}
            />
          </div>
          <TagInput
            label="Banned Words"
            tags={(edits.bannedWords as string[]) ?? []}
            onAdd={(tag) => {
              const current = (edits.bannedWords as string[]) ?? [];
              setField("bannedWords", [...current, tag]);
            }}
            onRemove={(tag) => {
              const current = (edits.bannedWords as string[]) ?? [];
              setField(
                "bannedWords",
                current.filter((t) => t !== tag),
              );
            }}
          />
        </div>

        <Separator />

        {/* Audience */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brand" weight="fill" />
            <h3 className="text-sm font-semibold">Audience</h3>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-audienceType" className="text-sm font-medium">Audience Type</Label>
            <Select
              value={(edits.audienceType as string) ?? ""}
              onValueChange={(v) => setField("audienceType", v)}
            >
              <SelectTrigger id="edit-audienceType" className="rounded-sm min-h-10 border-border focus-within:border-brand">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TagInput
            label="Interests"
            tags={(edits.interests as string[]) ?? []}
            onAdd={(tag) => {
              const current = (edits.interests as string[]) ?? [];
              setField("interests", [...current, tag]);
            }}
            onRemove={(tag) => {
              const current = (edits.interests as string[]) ?? [];
              setField(
                "interests",
                current.filter((t) => t !== tag),
              );
            }}
          />
          <TagInput
            label="Pain Points"
            tags={(edits.painPoints as string[]) ?? []}
            onAdd={(tag) => {
              const current = (edits.painPoints as string[]) ?? [];
              setField("painPoints", [...current, tag]);
            }}
            onRemove={(tag) => {
              const current = (edits.painPoints as string[]) ?? [];
              setField(
                "painPoints",
                current.filter((t) => t !== tag),
              );
            }}
          />
          <TagInput
            label="Competitors"
            tags={(edits.competitors as string[]) ?? []}
            onAdd={(tag) => {
              const current = (edits.competitors as string[]) ?? [];
              setField("competitors", [...current, tag]);
            }}
            onRemove={(tag) => {
              const current = (edits.competitors as string[]) ?? [];
              setField(
                "competitors",
                current.filter((t) => t !== tag),
              );
            }}
          />
        </div>

        <Separator />

        {/* Goals */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-brand" weight="fill" />
            <h3 className="text-sm font-semibold">Goals</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {GOAL_OPTIONS.map((goal) => {
              const currentGoals = (edits.goals as string[]) ?? [];
              const isSelected = currentGoals.includes(goal);
              return (
                <Badge
                  key={goal}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer text-xs normal-case tracking-normal min-h-9 flex items-center gap-1.5 px-3",
                    isSelected && "bg-success/10 text-success border-success/20",
                  )}
                  onClick={() => {
                    const next = isSelected
                      ? currentGoals.filter((g) => g !== goal)
                      : [...currentGoals, goal];
                    setField("goals", next);
                  }}
                >
                  {isSelected && <CheckCircle className="size-3" weight="fill" />}
                  {goal.replace(/_/g, " ")}
                </Badge>
              );
            })}
          </div>
        </div>

        {platformEntries.length > 0 && (
          <>
            <Separator />
            {/* Platforms */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-brand" weight="fill" />
                <h3 className="text-sm font-semibold">Platform Contexts</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Platform defaults are AI-suggested. For detailed edits, save first and adjust in settings.
              </p>
              <Accordion type="single" collapsible className="w-full">
                {platformEntries.map(([platform]) => (
                  <AccordionItem key={platform} value={platform}>
                    <AccordionTrigger className="text-sm font-medium capitalize">
                      {platform}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground">
                        Defaults generated from brand voice and platform conventions.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </>
        )}

        {/* Save / Cancel */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} className="rounded-sm min-h-10">
            <CheckCircle className="size-4" weight="fill" />
            Save Changes &amp; Confirm
          </Button>
          <Button variant="outline" onClick={onCancel} className="rounded-sm min-h-10">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
