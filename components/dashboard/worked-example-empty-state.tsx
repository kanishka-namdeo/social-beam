"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Sparkle, PencilSimple, CaretDown } from "@phosphor-icons/react/ssr";
import { platformIcon } from "@/lib/oauth/platform-icons";
import { StartingVerbs } from "./starting-verbs";
import { cn } from "@/lib/utils";

interface SamplePost {
  platform: string;
  content: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

const samplePosts: SamplePost[] = [
  {
    platform: "instagram",
    content: "Monday motivation: Life begins after coffee. What's your Monday goal? #MondayMotivation",
    confidence: "HIGH",
  },
  {
    platform: "x",
    content: "Our new summer cold brew collection is live! Drop by and grab yours. #ColdBrew #SummerVibes",
    confidence: "MEDIUM",
  },
  {
    platform: "linkedin",
    content: "We're excited to announce our summer cold brew collection — crafted from single-origin beans, cold-steeped for 24 hours.",
    confidence: "HIGH",
  },
];

const confidenceConfig = {
  HIGH: { label: "High confidence", className: "bg-ai-confidence-high/10 text-ai-confidence-high" },
  MEDIUM: { label: "Medium confidence", className: "bg-ai-confidence-medium/10 text-ai-confidence-medium" },
  LOW: { label: "Low confidence", className: "bg-ai-confidence-low/10 text-ai-confidence-low" },
};

const STEPS = [
  { number: 1, title: "Tell us about your business", desc: "Share your industry and goals for tailored content" },
  { number: 2, title: "Connect your social accounts", desc: "Link Instagram, X, LinkedIn, or other platforms" },
  { number: 3, title: "Generate your first post", desc: "Let AI create content that matches your brand" },
];

export function WorkedExampleEmptyState() {
  const router = useRouter();
  const [showSteps, setShowSteps] = useState(false);
  const [showExample, setShowExample] = useState(false);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-medium tracking-tight text-foreground">
          Welcome to SocialBeam
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI-powered social media management platform.
        </p>
      </div>

      {/* Quick-Start Guide — expandable */}
      <div className="rounded-sm border bg-card">
        <button
          type="button"
          onClick={() => setShowSteps(!showSteps)}
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          aria-expanded={showSteps}
        >
          <h3 className="text-base font-medium tracking-tight text-foreground">Get started in 3 steps</h3>
          <CaretDown
            className={cn("size-4 text-muted-foreground transition-transform duration-normal", showSteps && "rotate-180")}
          />
        </button>
        {showSteps && (
          <div className="px-4 pb-4">
            <Separator className="mb-4" />
            <div className="space-y-3">
              {STEPS.map((step) => (
                <div key={step.number} className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-primary text-primary-foreground text-xs font-semibold shrink-0">{step.number}</div>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="default" size="sm" onClick={() => router.push('/onboarding')} className="rounded-sm">
                Complete Onboarding
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/settings?tab=accounts')} className="rounded-sm">
                Connect Accounts
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sample Week Preview — behind "See an example" link */}
      <div>
        {!showExample ? (
          <button
            type="button"
            onClick={() => setShowExample(true)}
            className="flex items-center gap-2 text-sm text-brand hover:text-brand/80 transition-colors"
          >
            <Sparkle className="size-4" weight="fill" />
            See an example of what a week looks like
            <CaretDown className="size-4" />
          </button>
        ) : (
          <Card className="rounded-sm border-dashed">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium tracking-tight text-foreground flex items-center gap-2">
                  <Sparkle className="size-4 text-brand" weight="fill" />
                  Example: A Week for Brew & Bean Coffee Co.
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowExample(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Hide
                </button>
              </div>
              <CardDescription>
                Click any post to edit and make it yours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {samplePosts.map((post, index) => (
                <div
                  key={index}
                  className="group rounded-sm border border-border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1">
                      <div className="mt-0.5 text-muted-foreground">
                        {platformIcon(post.platform)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm text-foreground leading-relaxed">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${confidenceConfig[post.confidence].className}`}>
                            {confidenceConfig[post.confidence].label}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {post.platform}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => router.push(`/compose?prompt=${encodeURIComponent(post.content)}`)}
                    >
                      <PencilSimple className="size-4 mr-1" weight="bold" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Starting Actions */}
      <StartingVerbs />

      {/* Footer */}
      <Separator />
      <p className="text-xs text-muted-foreground text-center">
        Supports Instagram, X/Twitter, LinkedIn, Facebook, TikTok, and Pinterest.
      </p>
    </div>
  );
}
