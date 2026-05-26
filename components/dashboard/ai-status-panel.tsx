"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Robot, Sparkle, Clock } from "@phosphor-icons/react/ssr";
import { useState } from "react";

interface PendingReview {
  id: string;
  title: string;
  platforms: string[];
  createdAt: string;
}

interface AIStatusPanelProps {
  agentActivity?: string;
  pendingReviews?: PendingReview[];
}

export function AIStatusPanel({ agentActivity, pendingReviews }: AIStatusPanelProps) {
  const [command, setCommand] = useState("");

  return (
    <Card className="border-ai-surface bg-ai-surface/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Robot className="size-5 text-brand" weight="fill" />
          AI Agent Status
        </CardTitle>
        <CardDescription>What the AI is working on and pending items</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Activity */}
        <div className="flex items-start gap-3">
          <div className="relative mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-ai-surface">
            <div className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
            <Sparkle className="relative size-3.5 text-brand" weight="fill" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-foreground">
              {agentActivity ?? "No active tasks"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Last updated just now
            </p>
          </div>
        </div>

        {/* Pending Reviews */}
        {pendingReviews && pendingReviews.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Clock className="size-3.5" weight="bold" />
                Pending Review ({pendingReviews.length})
              </p>
              <div className="space-y-1.5">
                {pendingReviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex items-center justify-between rounded-lg bg-ai-surface/80 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {review.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {review.platforms.join(" · ")} · {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="outline" size="xs">
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Quick Command */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ask the AI agent something..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="flex-1 text-sm"
          />
          <Button variant="default" size="sm" className="whitespace-nowrap">
            <Sparkle className="mr-1 size-4" weight="fill" />
            Ask
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
