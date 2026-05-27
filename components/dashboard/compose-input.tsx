"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "@phosphor-icons/react/ssr";

export function ComposeInput() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleCompose = () => {
    const params = value ? `?prompt=${encodeURIComponent(value)}` : "";
    router.push(`/compose${params}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCompose();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What do you want to post about? Press Enter to compose..."
        className="text-base border-brand/20 bg-brand/5 focus-within:border-brand"
      />
      <Button variant="default" size="sm" onClick={handleCompose} className="shrink-0">
        Compose
        <ArrowRight className="ml-1 size-4" weight="bold" />
      </Button>
    </div>
  );
}
