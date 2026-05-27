"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Sparkle, PencilSimple } from "@phosphor-icons/react/ssr";
import { platformIcon } from "@/lib/oauth/platform-icons";
import { StartingVerbs } from "./starting-verbs";

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

export function WorkedExampleEmptyState() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome to SocialBeam
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI-powered social media management platform. Here&apos;s what your week could look like:
        </p>
      </div>

      {/* Quick-Start Guide */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground mb-3">Get started in 3 steps</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">1</div>
            <div>
              <p className="text-sm font-medium">Tell us about your business</p>
              <p className="text-xs text-muted-foreground">Share your industry and goals for tailored content</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">2</div>
            <div>
              <p className="text-sm font-medium">Connect your social accounts</p>
              <p className="text-xs text-muted-foreground">Link Instagram, X, LinkedIn, or other platforms</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">3</div>
            <div>
              <p className="text-sm font-medium">Generate your first post</p>
              <p className="text-xs text-muted-foreground">Let AI create content that matches your brand</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="default" size="sm" onClick={() => router.push('/onboarding')}>
            Complete Onboarding
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/settings?tab=accounts')}>
            Connect Accounts
          </Button>
        </div>
      </div>

      {/* Sample Week Preview */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="size-5 text-brand" weight="fill" />
            Example: A Week for Brew & Bean Coffee Co.
          </CardTitle>
          <CardDescription>
            Click any post to edit and make it yours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {samplePosts.map((post, index) => (
            <div
              key={index}
              className="group rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
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

      {/* Starting Actions */}
      <StartingVerbs />

      {/* Footer */}
      <Separator />
      <p className="text-xs text-muted-foreground text-center">
        Supports Instagram, X/Twitter, LinkedIn, Facebook, TikTok, and Pinterest.
        AI features powered by credits — get 100 free credits on signup.
      </p>
    </div>
  );
}
