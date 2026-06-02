import type { Metadata } from "next";
import { LandingPageShell } from "@/components/landing/landing-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, ChatCircle, VideoCamera, Megaphone, UsersThree, Code } from "@phosphor-icons/react/ssr";

export const metadata: Metadata = {
  title: "Community — Join the SocialBeam Community",
  description:
    "Connect with marketers, creators, and founders using SocialBeam. Join our Discord, follow us on social media, and contribute to the roadmap.",
  alternates: {
    canonical: "https://socialbeam.ai/community",
  },
  openGraph: {
    title: "Community — Join the SocialBeam Community",
    description:
      "Connect with marketers, creators, and founders using SocialBeam. Join our Discord, follow us on social media, and contribute to the roadmap.",
    url: "https://socialbeam.ai/community",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Join the SocialBeam Community",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Community — Join the SocialBeam Community",
    description:
      "Connect with marketers, creators, and founders using SocialBeam. Join our Discord, follow us on social media, and contribute to the roadmap.",
    images: ["/og-image.svg"],
  },
};

const channels = [
  {
    icon: ChatCircle,
    title: "Discord Community",
    description:
      "Join 500+ marketers and creators sharing tips, strategies, and social media insights in real time.",
    linkLabel: "Join Discord",
    href: "https://discord.gg/socialbeam",
    accent: "bg-indigo-500/10 text-indigo-500",
  },
  {
    icon: VideoCamera,
    title: "Community Calls",
    description:
      "Monthly product demos and feedback sessions. Shape the features we build next.",
    linkLabel: "View Schedule",
    href: "/contact",
    accent: "bg-amber-500/10 text-amber-500",
  },
  {
    icon: Megaphone,
    title: "Roadmap & Voting",
    description:
      "Vote on features, suggest improvements, and see what's coming next. Your input drives our priorities.",
    linkLabel: "View Roadmap",
    href: "/contact",
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: UsersThree,
    title: "User Stories",
    description:
      "Read how marketers and creators are growing their audiences with AI-powered scheduling.",
    linkLabel: "Read Stories",
    href: "/blog",
    accent: "bg-rose-500/10 text-rose-500",
  },
  {
    icon: Code,
    title: "Open Source",
    description:
      "Our SDK and integrations are open source. Contribute code, report issues, or build your own integrations.",
    linkLabel: "View on GitHub",
    href: "https://github.com/socialbeam",
    accent: "bg-muted/10 text-muted-foreground",
  },
];

const stats = [
  { label: "Community Members", value: "500+" },
  { label: "Platforms Supported", value: "7+" },
  { label: "Countries", value: "40+" },
  { label: "Discord Channels", value: "15+" },
];

export default function CommunityPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Join a community of smart social media managers",
        description:
          "Connect with marketers, creators, and founders who are growing their audiences with AI-powered scheduling. Share tips, get feedback, and shape our product.",
        ctaLabel: "Join Discord",
        ctaHref: "https://discord.gg/socialbeam",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 rounded-sm bg-card border border-border">
              <div className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Channels */}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight text-center mb-8">
            Connect With Us
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <Card key={channel.title} className="border-border rounded-sm hover-lift transition-shadow">
                  <CardHeader className="pb-3">
                    <div className={`p-3 ${channel.accent} w-fit mb-3 rounded-sm`} aria-hidden="true">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl text-foreground tracking-tight">{channel.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-muted-foreground text-base leading-relaxed">
                      {channel.description}
                    </CardDescription>
                    <Button variant="ghost" className="gap-2 text-brand hover:text-brand p-0 h-auto" asChild>
                      <Link href={channel.href}>
                        {channel.linkLabel} <ArrowRight weight="bold" className="w-4 h-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* User Stories Preview */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Featured from the community
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            &ldquo;SocialBeam cut my weekly content planning from 4 hours to 30 minutes. The AI knows my voice better than I do.&rdquo;
          </p>
          <p className="text-sm text-muted-foreground">
            — <span className="text-foreground">Sarah K.</span>, Marketing Director
          </p>
          <Button variant="outline" className="gap-2 mt-4" asChild>
            <Link href="/blog">
              Read More Stories <ArrowRight weight="bold" className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </LandingPageShell>
  );
}
