import type { Metadata } from "next";
import { Hash, TextT, Link, ImageSquare, Sparkle } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";
import { ToolsCard } from "@/components/tools/tools-card";

export const metadata: Metadata = {
  title: "Free Social Media Tools — Hashtag Generator, UTM Builder, Link in Bio | SocialBeam",
  description:
    "Free tools for social media marketers. Hashtag generator, post creator, UTM builder, link in bio, and Instagram name generator — no signup required.",
};

const tools = [
  {
    icon: Hash,
    title: "Hashtag Generator",
    description:
      "AI-powered hashtag suggestions for Instagram, TikTok, YouTube, X, and LinkedIn. Get categorized hashtags by niche, industry, and audience.",
    href: "/free-tools/hashtag-generator",
  },
  {
    icon: TextT,
    title: "Social Media Post Creator",
    description:
      "Generate platform-optimized posts with AI. Choose your platform and tone — get ready-to-publish captions in seconds.",
    href: "/free-tools/post-creator",
  },
  {
    icon: Link,
    title: "UTM Generator",
    description:
      "Build trackable campaign URLs in seconds. Add UTM parameters for source, medium, campaign, term, and content.",
    href: "/free-tools/utm-generator",
  },
  {
    icon: ImageSquare,
    title: "Link in Bio",
    description:
      "Create a customizable link-in-bio page for your social profiles. Add links, choose themes, and share your unique URL.",
    href: "/free-tools/link-in-bio",
  },
  {
    icon: Sparkle,
    title: "Instagram Name Generator",
    description:
      "Generate creative, on-brand Instagram name ideas. Choose from professional, fun, creative, or minimal styles.",
    href: "/free-tools/instagram-name-generator",
  },
];

export default function FreeToolsPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Grow on social — no account needed",
        description:
          "Hashtag generator, post creator, UTM builder, and more. Use them right now, no signup required.",
      }}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {tools.map((tool) => (
          <ToolsCard
            key={tool.title}
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            href={tool.href}
          />
        ))}
      </div>
    </LandingPageShell>
  );
}
