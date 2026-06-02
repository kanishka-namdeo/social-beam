import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sparkle,
  CalendarCheck,
  ChartBar,
  Clock,
  Users,
  PaintBrush,
  ShieldCheck,
  Globe,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Features — Free AI-Powered Social Media Scheduler | SocialBeam",
  description:
    "AI content creation, visual calendar scheduling, actionable analytics, and smart posting times. All free for up to 10 accounts.",
};

const features = [
  {
    icon: Sparkle,
    title: "AI Content Engine",
    description:
      "Describe what you want. AI writes platform-optimized captions, hashtags, and full campaigns tailored to your brand voice.",
  },
  {
    icon: CalendarCheck,
    title: "Free Forever Scheduling",
    description:
      "10 accounts. Unlimited posts. Visual drag-and-drop calendar. No credit card required, no limits on basic scheduling.",
  },
  {
    icon: ChartBar,
    title: "Actionable Analytics",
    description:
      "Natural language insights, not raw data dumps. AI tells you what to do next based on your performance data.",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description:
      "AI predicts optimal posting times per platform — delivering 25-40% engagement lift over manual scheduling.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Assign roles, approve posts, and manage workflows. Built for teams of any size with clear permissions.",
  },
  {
    icon: PaintBrush,
    title: "Brand Voice Training",
    description:
      "Upload your style guide or past content. AI learns your voice and maintains consistency across all platforms.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description:
      "SOC 2 compliant, encrypted tokens, role-based access. Your data and social accounts stay protected.",
  },
  {
    icon: Globe,
    title: "Multi-Platform Support",
    description:
      "X, LinkedIn, Instagram, Facebook, TikTok, Pinterest, Reddit, and more — all managed from one dashboard.",
  },
];

export default function FeaturesPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Everything you need to grow on social media",
        description:
          "From AI-powered content creation to smart scheduling and actionable analytics — all the tools your team needs in one platform.",
      }}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="border-border rounded-sm hover-lift transition-shadow">
              <CardHeader className="pb-3">
                <div className="p-3 bg-brand/10 text-brand w-fit mb-3 rounded-sm" aria-hidden="true">
                  <Icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-foreground tracking-tight">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-muted-foreground text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </LandingPageShell>
  );
}
