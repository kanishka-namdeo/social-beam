import type { Metadata } from "next";
import { LandingPageShell } from "@/components/landing/landing-page-shell";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Changelog — What's New in SocialBeam",
  description:
    "See what's new in SocialBeam. Product updates, new features, improvements, and bug fixes — shipped weekly.",
  alternates: {
    canonical: "https://socialbeam.ai/changelog",
  },
  openGraph: {
    title: "Changelog — What's New in SocialBeam",
    description:
      "See what's new in SocialBeam. Product updates, new features, improvements, and bug fixes — shipped weekly.",
    url: "https://socialbeam.ai/changelog",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "SocialBeam Changelog — What's new",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog — What's New in SocialBeam",
    description:
      "See what's new in SocialBeam. Product updates, new features, improvements, and bug fixes — shipped weekly.",
    images: ["/og-image.svg"],
  },
};

const releases = [
  {
    date: "May 2026",
    version: "1.8.0",
    title: "AI Brand Voice Training",
    description: "Upload your style guide or past content — AI learns your voice and maintains consistency across all platforms.",
    type: "feature" as const,
    items: [
      "Brand Voice AI now supports multi-language detection",
      "Voice training dashboard with quality scoring",
      "Export learned voice profiles for team sharing",
    ],
  },
  {
    date: "May 2026",
    version: "1.7.0",
    title: "Reddit Trending Radar",
    description: "Real-time trend monitoring across 50+ subreddits. Discover viral content before it peaks.",
    type: "feature" as const,
    items: [
      "Subreddit manager with custom tracking lists",
      "Trending post chips for quick content ideation",
      "Cross-reference trends with your posting calendar",
    ],
  },
  {
    date: "April 2026",
    version: "1.6.0",
    title: "AI Analytics Engine",
    description: "Natural language insights replace raw data dumps. AI tells you exactly what to do next.",
    type: "feature" as const,
    items: [
      "Weekly AI digest emails with top recommendations",
      "Confidence correlation analysis for posting times",
      "Content ranking with engagement predictions",
    ],
  },
  {
    date: "April 2026",
    version: "1.5.0",
    title: "Pinterest & TikTok Support",
    description: "Full scheduling and analytics support for Pinterest and TikTok, expanding platform coverage to 7+ networks.",
    type: "feature" as const,
    items: [
      "Pinterest Pin scheduler with board selection",
      "TikTok video upload and caption scheduling",
      "Platform-specific preview panels",
    ],
  },
  {
    date: "March 2026",
    version: "1.4.0",
    title: "Team Collaboration",
    description: "Invite team members, assign roles, and manage approval workflows — all from one dashboard.",
    type: "improvement" as const,
    items: [
      "Role-based access control (Admin, Editor, Viewer)",
      "Post approval workflow with notifications",
      "Team activity log for audit trails",
    ],
  },
  {
    date: "March 2026",
    version: "1.3.0",
    title: "Visual Calendar Overhaul",
    description: "Redesigned calendar with drag-and-drop scheduling, content gap analysis, and posting frequency insights.",
    type: "improvement" as const,
    items: [
      "Drag-and-drop post rescheduling",
      "Content gap analysis sidebar",
      "Week and day view modes",
      "Posting frequency heat map",
    ],
  },
  {
    date: "February 2026",
    version: "1.2.0",
    title: "Free Tier Launch",
    description: "10 accounts, unlimited posts — no credit card required. Professional features, free forever.",
    type: "feature" as const,
    items: [
      "Free tier: 10 accounts, unlimited posts",
      "AI Starter: 25 accounts + full AI suite access",
      "AI Pro: 50 accounts + priority support",
    ],
  },
  {
    date: "January 2026",
    version: "1.1.0",
    title: "Multi-Platform Support",
    description: "Launch with support for X, LinkedIn, Instagram, and Facebook. One dashboard, all your platforms.",
    type: "feature" as const,
    items: [
      "X (Twitter) scheduling with thread support",
      "LinkedIn post and article scheduling",
      "Instagram Feed, Reels, and Stories support",
      "Facebook Page and Group posting",
    ],
  },
  {
    date: "December 2025",
    version: "1.0.0",
    title: "SocialBeam Launch",
    description: "AI-native social media management platform launches. Schedule smarter with AI.",
    type: "milestone" as const,
    items: [
      "Core scheduling engine with AI content generation",
      "Visual calendar with smart time recommendations",
      "Basic analytics dashboard",
    ],
  },
];

function ReleaseBadge({ type }: { type: string }) {
  const variants: Record<string, string> = {
    feature: "bg-brand/10 text-brand border-brand/20",
    improvement: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    fix: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    milestone: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  };
  return (
    <Badge variant="outline" className={`rounded-sm capitalize ${variants[type] ?? variants.fix}`}>
      {type}
    </Badge>
  );
}

export default function ChangelogPage() {
  return (
    <LandingPageShell
      hero={{
        title: "What's new in SocialBeam",
        description:
          "Product updates, new features, improvements, and bug fixes. We ship weekly and communicate every change here.",
      }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {releases.map((release) => (
          <div
            key={release.version}
            className="p-6 rounded-sm bg-card border border-border hover-lift transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground">{release.date}</span>
              <span className="text-sm font-mono text-brand">{release.version}</span>
              <ReleaseBadge type={release.type} />
            </div>
            <h3 className="text-xl font-semibold text-foreground tracking-tight mb-2">
              {release.title}
            </h3>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {release.description}
            </p>
            <ul className="space-y-2">
              {release.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-brand mt-1 shrink-0">&bull;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </LandingPageShell>
  );
}
