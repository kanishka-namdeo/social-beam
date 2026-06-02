import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Rocket,
  Heart,
  Brain,
  ShieldCheck,
  ChartLineUp,
  Users,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "About — AI-Powered Social Media Scheduler | SocialBeam",
  description:
    "SocialBeam is an AI-native social media management platform. Our mission is to make professional social media scheduling accessible to everyone — completely free.",
  alternates: {
    canonical: "https://socialbeam.ai/about",
  },
  openGraph: {
    title: "About — AI-Powered Social Media Scheduler | SocialBeam",
    description:
      "SocialBeam is an AI-native social media management platform. Our mission is to make professional social media scheduling accessible to everyone — completely free.",
    url: "https://socialbeam.ai/about",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "About SocialBeam — AI-native social media management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About — AI-Powered Social Media Scheduler | SocialBeam",
    description:
      "SocialBeam is an AI-native social media management platform. Our mission is to make professional social media scheduling accessible to everyone — completely free.",
    images: ["/og-image.svg"],
  },
};

const values = [
  {
    icon: Rocket,
    title: "AI-Native by Default",
    description:
      "AI isn't a premium add-on — it's baked into every feature. From content creation to scheduling optimization, AI works for you at every step.",
  },
  {
    icon: Heart,
    title: "Free for Everyone",
    description:
      "10 accounts and unlimited posts on our free tier, forever. We believe professional tools shouldn't be locked behind paywalls for individuals.",
  },
  {
    icon: Brain,
    title: "Built by Marketers",
    description:
      "Our team combines social media expertise with cutting-edge AI research. We built the tool we wished existed for our own clients.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy First",
    description:
      "Your social accounts and data are encrypted at rest. We never sell your data, share it with third parties, or use it to train models.",
  },
  {
    icon: ChartLineUp,
    title: "Data-Driven Results",
    description:
      "Our AI scheduling delivers 25-40% engagement lift over manual timing. Every recommendation is backed by platform-specific data, not guesswork.",
  },
  {
    icon: Users,
    title: "Community-Centric",
    description:
      "We're building in public with a community of marketers, creators, and founders who shape the product roadmap through feedback and votes.",
  },
];

const milestones = [
  { year: "2025", event: "SocialBeam founded — AI-native social media scheduling platform launched" },
  { year: "2025", event: "Free tier launched — 10 accounts, unlimited posts, no credit card required" },
  { year: "2025", event: "Multi-platform support — X, Instagram, LinkedIn, Facebook, TikTok, Pinterest, Reddit" },
  { year: "2026", event: "Brand Voice AI — Upload style guides, AI learns and maintains your voice" },
  { year: "2026", event: "Reddit Trending Radar — Real-time trend monitoring for content ideation" },
  { year: "2026", event: "AI Analytics — Natural language insights, not raw data dumps" },
];

export default function AboutPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Social media management, reimagined with AI",
        description:
          "We're on a mission to make professional-grade social media scheduling accessible to everyone — powered by AI, not locked behind paywalls.",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Mission */}
        <div className="text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
            Our Mission
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Social media tools have been dominated by expensive enterprise platforms. We believe individuals,
            small businesses, and creators deserve the same AI-powered capabilities — without the enterprise price tag.
            SocialBeam makes it free.
          </p>
        </div>

        {/* Values */}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight text-center mb-8">
            What Drives Us
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} className="border-border rounded-sm hover-lift transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="p-3 bg-brand/10 text-brand w-fit mb-3 rounded-sm" aria-hidden="true">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl text-foreground tracking-tight">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground text-base leading-relaxed">
                      {value.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight text-center mb-8">
            Our Journey
          </h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {milestones.map((milestone, i) => (
              <div
                key={i}
                className="flex gap-4 items-start p-4 rounded-sm bg-card border border-border"
              >
                <span className="text-sm font-mono text-brand font-semibold shrink-0 pt-0.5">
                  {milestone.year}
                </span>
                <p className="text-muted-foreground text-base leading-relaxed">
                  {milestone.event}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Join us in reshaping social media management
          </h2>
          <p className="text-muted-foreground">
            Start scheduling smarter — free forever, no credit card required.
          </p>
        </div>
      </div>
    </LandingPageShell>
  );
}
