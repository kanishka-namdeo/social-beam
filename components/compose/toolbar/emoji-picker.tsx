"use client";

import { useState } from "react";
import { Smiley } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COMMON_EMOJIS = [
  // Row 1: Smileys
  "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲",
  // Row 2: Smileys continued
   "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘",
  // Row 3: Hearts & Love
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎",
  // Row 4: Gestures
  "👍", "👎", "👏", "🙌", "🤝", "🙏", "✌️", "🤞", "🤘",
  // Row 5: Objects
  "🔥", "✨", "🎉", "🎊", "🎁", "💡", "🔔", "📢", "🔒",
  // Row 6: Nature
  "☀️", "🌙", "⭐", "☁️", "⛅", "🌧️", "❄️", "🌈", "🌸",
];

interface EmojiPickerProps {
  onInsert: (emoji: string) => void;
}

export function EmojiPicker({ onInsert }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onInsert(emoji);
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
          aria-label="Insert emoji"
        >
          <Smiley className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 p-2"
      >
        <div className="grid grid-cols-7 sm:grid-cols-9 gap-0.5">
          {COMMON_EMOJIS.map((emoji, i) => (
            <button
              key={i}
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md text-lg hover:bg-muted active:bg-muted/80"
              onClick={() => handleSelect(emoji)}
              aria-label={`Insert ${emoji} emoji`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
