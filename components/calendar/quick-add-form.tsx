"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { notifySuccessWithCategory, notifyErrorWithCategory } from "@/lib/notifications";
import { Plus, X, Spinner } from "@phosphor-icons/react/ssr";

interface QuickAddFormProps {
  date: Date;
  onSuccess: () => void;
  onCancel: () => void;
  connectedPlatforms?: string[];
}

export function QuickAddForm({ date, onSuccess, onCancel, connectedPlatforms = [] }: QuickAddFormProps) {
  const [title, setTitle] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      notifyErrorWithCategory("Title is required", { category: "post_publish" });
      return;
    }

    if (selectedPlatforms.length === 0) {
      notifyErrorWithCategory("Select at least one platform", { category: "post_publish" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: title.trim(),
          platforms: selectedPlatforms,
          action: "draft",
          scheduledAt: date.toISOString(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create draft");
      }

      notifySuccessWithCategory("Draft created", {
        category: "post_publish",
        description: `Scheduled for ${date.toLocaleDateString()}`,
      });

      setTitle("");
      setSelectedPlatforms([]);
      onSuccess();
    } catch (err) {
      notifyErrorWithCategory(
        err instanceof Error ? err.message : "Failed to create draft",
        { category: "post_publish" }
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 p-2 bg-card border border-border rounded-sm"
    >
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Post title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 h-7 text-xs"
          disabled={loading}
          autoFocus
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {connectedPlatforms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {connectedPlatforms.map((platform) => (
            <label
              key={platform}
              className="flex items-center gap-1 text-xs cursor-pointer"
            >
              <Checkbox
                checked={selectedPlatforms.includes(platform)}
                onCheckedChange={() => togglePlatform(platform)}
                className="size-3"
                disabled={loading}
              />
              <span className="capitalize">{platform}</span>
            </label>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs gap-1"
          disabled={loading || !title.trim() || selectedPlatforms.length === 0}
        >
          {loading ? (
            <>
              <Spinner className="size-3 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="size-3" />
              Add Draft
            </>
          )}
        </Button>
        <a
          href={`/dashboard/compose?date=${date.toISOString().split("T")[0]}`}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Full compose
        </a>
      </div>
    </form>
  );
}
