"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkle, Spinner, ChatCircleText } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ReplyComposerProps {
  engagementItemId: string;
  platform: string;
  onReplySent: () => void;
}

export function ReplyComposer({ engagementItemId, platform, onReplySent }: ReplyComposerProps) {
  const [text, setText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState("");

  const characterLimit = 280; // default X limit
  const isOverLimit = text.length > characterLimit;

  const generateAIDraft = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/inbox/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementItemId }),
      });

      if (!res.ok) return;

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: content_chunk")) {
            const data = lines[lines.indexOf(line) + 1];
            if (data?.startsWith("data: ")) {
              const parsed = JSON.parse(data.slice(6));
              setDraft(parsed.content);
            }
          } else if (line.startsWith("event: draft_complete")) {
            const data = lines[lines.indexOf(line) + 1];
            if (data?.startsWith("data: ")) {
              const parsed = JSON.parse(data.slice(6));
              setText(parsed.content);
              setDraft("");
            }
          }
        }
      }
    } catch {
      // Silently fail - user can type manually
    } finally {
      setIsGenerating(false);
    }
  }, [engagementItemId]);

  const sendReply = useCallback(async () => {
    if (!text.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/inbox/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engagementItemId, text }),
      });
      if (res.ok) {
        setText("");
        setDraft("");
        onReplySent();
      }
    } catch {
      // Error handled by caller
    } finally {
      setIsSending(false);
    }
  }, [engagementItemId, text, onReplySent]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Reply on {platform}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={generateAIDraft}
          disabled={isGenerating}
          className="text-xs"
        >
          {isGenerating ? (
            <Spinner className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Sparkle className="mr-1.5 size-3.5" />
          )}
          {isGenerating ? "Generating..." : "AI Draft"}
        </Button>
      </div>

      {draft && (
        <div className="rounded-sm border border-ai-surface bg-ai-surface/50 p-3 text-sm text-muted-foreground animate-pulse">
          {draft}
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your reply..."
        className={cn(
          "min-h-[80px] resize-none",
          isOverLimit && "border-destructive",
        )}
      />

      <div className="flex items-center justify-between">
        <span className={cn(
          "text-xs tabular-nums",
          isOverLimit ? "text-destructive" : "text-muted-foreground",
        )}>
          {text.length}/{characterLimit}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={sendReply}
            disabled={!text.trim() || isSending}
          >
            {isSending ? (
              <Spinner className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <ChatCircleText className="mr-1.5 size-3.5" />
            )}
            Send Reply
          </Button>
        </div>
      </div>
    </div>
  );
}
