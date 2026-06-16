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
  ChatCircleText,
  RedditLogo,
  Image,
  Wrench,
  PlugsConnected,
  Megaphone,
  Robot,
  Eye,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Features — Social Media Management, Automated | SocialBeam",
  description:
    "Content creation, unified inbox, visual calendar scheduling, actionable analytics, Reddit trend discovery, and smart posting times. All free for up to 10 accounts.",
};

const features = [
  {
    icon: Sparkle,
    title: "AI Content Engine",
    description:
      "Describe the post you want. Get platform-optimized captions, hashtags, and campaigns in your brand voice — ready to publish.",
  },
  {
    icon: ChatCircleText,
    title: "Never Miss a Conversation",
    description:
      "Every comment, mention, and DM in one place. AI drafts replies so you respond faster and stay engaged.",
  },
  {
    icon: CalendarCheck,
    title: "Schedule Without Limits",
    description:
      "10 accounts. Unlimited posts. Drag-and-drop calendar. Free forever — not a trial, not a teaser.",
  },
  {
    icon: RedditLogo,
    title: "Catch Trends Before They Peak",
    description:
      "Discover trending topics matched to your brand. Turn what's hot into ready-to-publish posts in one click.",
  },
  {
    icon: ChartBar,
    title: "Insights That Tell You What to Do",
    description:
      "Skip the dashboards. Get plain-English recommendations on what to post next, when, and why.",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description:
      "Post when your audience is actually watching. AI picks the optimal time per platform — 25-40% more engagement than guessing.",
  },
  {
    icon: PaintBrush,
    title: "Your Voice, Every Platform",
    description:
      "Upload your style guide. The system learns your tone and keeps it consistent from LinkedIn thought leadership to Instagram captions.",
  },
  {
    icon: Image,
    title: "All Your Assets, One Place",
    description:
      "Upload, tag, and organize every image and video. Drag them straight into scheduled posts.",
  },
  {
    icon: Users,
    title: "Everyone Knows Their Role",
    description:
      "Assign tasks, review drafts, and approve posts — no stepping on each other's work. Built for teams of any size.",
  },
  {
    icon: Wrench,
    title: "Free Tools, No Signup",
    description:
      "Hashtag generator, post creator, UTM builder, link-in-bio, and Instagram name generator — all free, all usable without creating an account.",
  },
  {
    icon: PlugsConnected,
    title: "Let Your AI Agents Run It",
    description:
      "Connect Claude, Cursor, and any AI agent to manage your social presence autonomously. OAuth 2.1 with PKCE, 7 tool categories, and scope-based permissions.",
  },
  {
    icon: Megaphone,
    title: "Launch Campaigns in 4 Steps",
    description:
      "Describe your campaign. AI generates phased content, adapts to audience response, and recycles what works. Build multi-phase campaigns that evolve with your audience.",
  },
  {
    icon: Robot,
    title: "An Agent That Knows Your Brand",
    description:
      "A dedicated AI agent that studies your content, researches your market, and handles your social strategy end-to-end.",
  },
  {
    icon: Eye,
    title: "Competitive Intelligence",
    description:
      "See what's working for your competitors. Browse any platform's trending content and engagement data without getting blocked.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    description:
      "SOC 2 compliant. Encrypted connections. Role-based access. Your accounts and data stay protected.",
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
        title: "Every tool. Zero busywork.",
        description:
          "From content creation to smart scheduling and actionable analytics — all the tools your team needs in one platform.",
      }}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
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
