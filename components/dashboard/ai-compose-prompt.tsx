"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkle } from "@phosphor-icons/react/ssr";
import { HintTooltip } from "@/components/ui/hint-tooltip";

export function AIComposePrompt() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleCompose = () => {
    if (value.trim()) {
      router.push(`/compose?prompt=${encodeURIComponent(value.trim())}`);
    } else {
      router.push("/compose");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCompose();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <p className="text-sm text-muted-foreground">
          What would you like to post about today?
        </p>
        <HintTooltip
          hint="Tip: Try 'Write a LinkedIn post about AI trends in 2026' to get started"
        />
      </div>
      <div className="flex items-center gap-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your post idea..."
          className="text-base border-brand/20 bg-brand/5 focus-within:border-brand"
        />
        <Button variant="default" size="default" onClick={handleCompose}>
          <Sparkle className="mr-1 size-4" weight="fill" />
          Let AI help
        </Button>
      </div>
    </div>
  );
}
