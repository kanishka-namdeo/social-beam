"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  ArrowSquareOut,
  Crown,
  Lock,
  ChatCircleText,
  ChatText,
} from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { usePremium } from "@/hooks/use-premium";

export interface IntentSignal {
  type: string;
  text: string;
  location: "post" | "comment";
}

interface IntentScoreCardProps {
  intentScore: number;
  intentType: string | null;
  intentSignals: IntentSignal[] | null;
  postId: string;
  postTitle: string;
  className?: string;
}

const INTENT_TYPE_LABELS: Record<string, { label: string; classes: string }> = {
  ready_to_buy: { label: "Ready to buy", classes: "bg-success/10 text-success border-success/20" },
  solution_seeking: { label: "Solution seeking", classes: "bg-info/10 text-info border-info/20" },
  problem_aware: { label: "Problem aware", classes: "bg-warning/10 text-warning border-warning/20" },
};

function getIntentTypeLabel(type: string | null): { label: string; classes: string } {
  if (type && INTENT_TYPE_LABELS[type]) return INTENT_TYPE_LABELS[type];
  return { label: "Intent detected", classes: "bg-muted/10 text-muted-foreground border-muted/20" };
}

export function IntentScoreCard({ intentScore, intentType, intentSignals, postId, postTitle, className }: IntentScoreCardProps) {
  const { isPremium } = usePremium();

  if (intentScore < 70) return null;

  const typeInfo = getIntentTypeLabel(intentType);
  const signals = intentSignals?.slice(0, 3) ?? [];

  return (
    <Card className={cn("border-success/30 bg-success/5", className)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-success/10">
              <Target className="size-4 text-success" weight="fill" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">High-intent lead</p>
              <p className="text-xs text-muted-foreground">Score: {intentScore}/100</p>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs", typeInfo.classes)}>
            {typeInfo.label}
          </Badge>
        </div>

        <p className="text-sm text-foreground truncate" title={postTitle}>
          {postTitle}
        </p>

        {signals.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Signals detected</p>
            {signals.map((signal, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {signal.location === "post" ? (
                  <ChatText className="size-3 mt-0.5 text-muted-foreground shrink-0" />
                ) : (
                  <ChatCircleText className="size-3 mt-0.5 text-muted-foreground shrink-0" />
                )}
                <span className="text-foreground truncate">{signal.text}</span>
                <Badge variant="outline" className="text-[10px] shrink-0 ml-auto">
                  {signal.location}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {isPremium ? (
          <Button
            size="sm"
            className="w-full bg-success text-success-foreground hover:bg-success/90 gap-1.5"
            asChild
          >
            <Link href={`/compose?trendId=${postId}`}>
              Engage Now
              <ArrowSquareOut className="size-3.5" weight="bold" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full gap-1.5" asChild>
            <Link href="/billing">
              <Lock className="size-3.5" />
              Upgrade to engage
              <Crown className="size-3.5 text-warning" weight="fill" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
