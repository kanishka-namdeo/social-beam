"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CONTEXTUAL_EXAMPLES = [
  "Write a LinkedIn post about AI trends in 2026",
  "Share a behind-the-scenes moment from today",
  "Create a thread about our latest product update",
  "Write a quick tip for your followers",
];

function getRandomPlaceholder(): string {
  const idx = Math.floor(Math.random() * CONTEXTUAL_EXAMPLES.length);
  return `e.g. "${CONTEXTUAL_EXAMPLES[idx]}"`;
}

export function AIComposePrompt() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [placeholder] = useState(getRandomPlaceholder);

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
      <p className="text-sm text-muted-foreground">
        What would you like to post about today?
      </p>
      <div className="flex items-center gap-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="rounded-sm text-base border-brand/20 bg-brand/5 focus-within:border-brand"
        />
        <Button variant="default" size="default" onClick={handleCompose} className="rounded-sm">
          Compose
        </Button>
      </div>
    </div>
  );
}
