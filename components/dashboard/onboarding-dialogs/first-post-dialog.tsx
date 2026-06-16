"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PencilSimple, CheckCircle } from "@phosphor-icons/react";

interface FirstPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  stepNumber: number;
  totalSteps: number;
}

export function FirstPostDialog({
  open,
  onOpenChange,
  onComplete,
  stepNumber,
  totalSteps,
}: FirstPostDialogProps) {
  const router = useRouter();

  const handleCompose = () => {
    router.push("/compose");
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="text-sm text-muted-foreground mb-2">
            Step {stepNumber} of {totalSteps}
          </div>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="size-6 text-primary" weight="duotone" />
            You're almost there!
          </DialogTitle>
          <DialogDescription>
            Create your first post to start engaging with your audience. You can
            compose a new post or skip if you've already imported content.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
            <PencilSimple className="size-8 text-primary" weight="duotone" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Ready to share your first piece of content?
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button variant="outline" onClick={onComplete}>
            I already have posts
          </Button>
          <Button onClick={handleCompose}>
            <PencilSimple weight="bold" />
            Compose your first post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
