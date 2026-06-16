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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AboutYouDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  stepNumber: number;
  totalSteps: number;
}

const INDUSTRIES = [
  "Technology",
  "E-commerce",
  "Health & Fitness",
  "Education",
  "Finance",
  "Food & Beverage",
  "Fashion & Beauty",
  "Travel",
  "Real Estate",
  "Entertainment",
  "Non-profit",
  "Consulting",
  "Other",
];

export function AboutYouDialog({
  open,
  onOpenChange,
  onComplete,
  stepNumber,
  totalSteps,
}: AboutYouDialogProps) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/onboarding/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "about_you",
          data: {
            name: name.trim(),
            businessType: industry,
            audienceDescription: productDesc.trim(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save information");
      }

      toast.success("Information saved successfully");
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save information");
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
          <DialogTitle>Tell us about you</DialogTitle>
          <DialogDescription>
            Help us personalize your experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Business/Brand Name <span className="text-destructive">*</span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your business or brand name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Industry</label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger>
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Product/Service Description
            </label>
            <Textarea
              id="description"
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              placeholder="Briefly describe what you offer"
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
            disabled={!name.trim() || isSaving}
          >
            {isSaving ? "Saving..." : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
