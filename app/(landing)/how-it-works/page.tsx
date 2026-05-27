import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plugs, Sparkle, CalendarPlus, ArrowRight } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "How It Works — Social Media Scheduler in 3 Steps | SocialBeam",
  description:
    "Connect your accounts, create content with AI, and schedule posts in seconds. Get started in under 5 minutes.",
};

const steps = [
  {
    number: "01",
    icon: Plugs,
    title: "Connect your accounts",
    description:
      "Link your social media accounts in seconds. We support X, LinkedIn, Instagram, Facebook, TikTok, Pinterest, and more. OAuth-based, secure, and revocable anytime.",
    details: [
      "One-click OAuth connection",
      "No password sharing required",
      "Support for 10+ platforms",
      "Revoke access anytime",
    ],
  },
  {
    number: "02",
    icon: Sparkle,
    title: "Create content with AI",
    description:
      "Tell the AI what you want to post — a product launch, a thought leadership piece, or a campaign. It writes platform-optimized captions, suggests hashtags, and matches your brand voice.",
    details: [
      "Platform-optimized captions",
      "Smart hashtag suggestions",
      "Brand voice matching",
      "Image and video prompts",
    ],
  },
  {
    number: "03",
    icon: CalendarPlus,
    title: "Schedule & publish",
    description:
      "Drop posts into the visual calendar or let AI pick the best times. Sit back while SocialBeam publishes automatically across all your connected accounts.",
    details: [
      "Drag-and-drop calendar",
      "AI-predicted optimal times",
      "Bulk scheduling support",
      "Real-time publishing status",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Get started in 3 simple steps",
        description:
          "From sign-up to your first scheduled post in under 5 minutes. No credit card required, no complicated setup.",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.number} className="border-border hover-lift transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand text-brand-soft font-bold text-lg shrink-0" aria-hidden="true">
                    {step.number}
                  </div>
                  <div className="p-3 bg-brand/10 text-brand rounded-md shrink-0" aria-hidden="true">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-foreground">{step.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <CardDescription className="text-muted-foreground text-base">
                  {step.description}
                </CardDescription>
                <ul className="grid sm:grid-cols-2 gap-2">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex items-center gap-2 text-sm text-foreground">
                      <ArrowRight weight="bold" className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}

        <div className="text-center pt-8">
          <Link href="/register">
            <Button size="lg" className="gap-2 hover-lift">
              Get Started Free
              <ArrowRight weight="bold" className="w-4 h-4" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>
    </LandingPageShell>
  );
}
