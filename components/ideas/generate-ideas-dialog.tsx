"use client";

import { useState } from "react";
import { Sparkle, X } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface GenerateIdeasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (ideas: Array<{
    title: string;
    content: string;
    category: string;
    source: "AI_GENERATED";
  }>) => void;
}

export function GenerateIdeasDialog({
  open,
  onOpenChange,
  onGenerate,
}: GenerateIdeasDialogProps) {
  const [category, setCategory] = useState<string>("");
  const [count, setCount] = useState<string>("5");
  const [context, setContext] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: parseInt(count),
          category: category || undefined,
          context: context || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate ideas");
      }

      const data = await response.json();
      
      toast.success(`Generated ${data.ideas.length} content ideas`);
      onGenerate(data.ideas);
      onOpenChange(false);
      
      // Reset form
      setCategory("");
      setCount("5");
      setContext("");
    } catch (error) {
      console.error("Generate ideas error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Generate Content Ideas
          </DialogTitle>
          <DialogDescription>
            AI will generate content ideas based on your brand context and preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Any category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Educational">Educational</SelectItem>
                <SelectItem value="Behind the Scenes">Behind the Scenes</SelectItem>
                <SelectItem value="Industry News">Industry News</SelectItem>
                <SelectItem value="Tips & Tricks">Tips & Tricks</SelectItem>
                <SelectItem value="Case Study">Case Study</SelectItem>
                <SelectItem value="Thought Leadership">Thought Leadership</SelectItem>
                <SelectItem value="User Generated Content">User Generated Content</SelectItem>
                <SelectItem value="Product Update">Product Update</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="count">Number of ideas</Label>
            <Select value={count} onValueChange={setCount}>
              <SelectTrigger id="count">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 idea</SelectItem>
                <SelectItem value="3">3 ideas</SelectItem>
                <SelectItem value="5">5 ideas</SelectItem>
                <SelectItem value="7">7 ideas</SelectItem>
                <SelectItem value="10">10 ideas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Additional context (optional)</Label>
            <Textarea
              id="context"
              placeholder="e.g., Focus on recent product launches, target audience is developers..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? (
              <>
                <Sparkle className="size-4 animate-spin" weight="fill" />
                Generating...
              </>
            ) : (
              <>
                <Sparkle className="size-4" weight="fill" />
                Generate Ideas
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
