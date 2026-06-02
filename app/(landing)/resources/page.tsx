import type { Metadata } from "next";
import { LandingPageShell } from "@/components/landing/landing-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BookOpen, Lightbulb, Wrench, Megaphone } from "@phosphor-icons/react/ssr";

export const metadata: Metadata = {
  title: "Resources — Social Media Marketing Guides & Tools",
  description:
    "Free social media marketing guides, tools, templates, and insights. Learn how to grow your audience with AI-powered scheduling strategies.",
  alternates: {
    canonical: "https://socialbeam.ai/resources",
  },
  openGraph: {
    title: "Resources — Social Media Marketing Guides & Tools",
    description:
      "Free social media marketing guides, tools, templates, and insights. Learn how to grow your audience with AI-powered scheduling strategies.",
    url: "https://socialbeam.ai/resources",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "SocialBeam Resources — Marketing guides and tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resources — Social Media Marketing Guides & Tools",
    description:
      "Free social media marketing guides, tools, templates, and insights. Learn how to grow your audience with AI-powered scheduling strategies.",
    images: ["/og-image.svg"],
  },
};

const categories = [
  {
    icon: BookOpen,
    title: "Social Media Guides",
    description:
      "Step-by-step guides for every major platform. Learn how to schedule, optimize, and grow on Instagram, X, LinkedIn, TikTok, and more.",
    href: "/blog",
    accent: "bg-brand/10 text-brand",
  },
  {
    icon: Lightbulb,
    title: "Best Time to Post",
    description:
      "Data-driven recommendations for optimal posting times on every platform. Updated monthly with the latest engagement data.",
    href: "/blog",
    accent: "bg-amber-500/10 text-amber-500",
  },
  {
    icon: Wrench,
    title: "Free Tools",
    description:
      "Social media calculators, hashtag generators, and content planning tools — all free, no account required.",
    href: "/blog",
    accent: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: Megaphone,
    title: "Social Media Glossary",
    description:
      "A-Z definitions for social media marketing terms. From &quot;algorithm&quot; to &quot;reach&quot; — never feel lost in a meeting again.",
    href: "/blog",
    accent: "bg-indigo-500/10 text-indigo-500",
  },
];

const quickLinks = [
  { label: "How to Post on TikTok", href: "/blog" },
  { label: "Instagram Reels Best Practices", href: "/blog" },
  { label: "LinkedIn Post Templates", href: "/blog" },
  { label: "Facebook Ads vs Organic", href: "/blog" },
  { label: "X (Twitter) Growth Strategy", href: "/blog" },
  { label: "Pinterest SEO Tips", href: "/blog" },
  { label: "Content Calendar Template", href: "/blog" },
  { label: "Social Media ROI Calculator", href: "/blog" },
];

export default function ResourcesPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Everything you need to master social media",
        description:
          "Free guides, tools, templates, and insights — powered by real data from thousands of SocialBeam users.",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Categories */}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight text-center mb-8">
            Browse by Category
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.title} className="border-border rounded-sm hover-lift transition-shadow">
                  <CardHeader className="pb-3">
                    <div className={`p-3 ${category.accent} w-fit mb-3 rounded-sm`} aria-hidden="true">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl text-foreground tracking-tight">{category.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <CardDescription className="text-muted-foreground text-base leading-relaxed">
                      {category.description}
                    </CardDescription>
                    <Button variant="ghost" className="gap-2 text-brand hover:text-brand p-0 h-auto" asChild>
                      <Link href={category.href}>
                        Explore <ArrowRight weight="bold" className="w-4 h-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight text-center mb-8">
            Popular Resources
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex items-center gap-2 p-3 rounded-sm border border-border hover:border-brand/50 hover:bg-brand/5 transition-colors text-foreground text-sm"
              >
                <ArrowRight weight="bold" className="w-4 h-4 text-brand shrink-0" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Want personalized recommendations?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Sign up for free and get AI-powered content suggestions based on your industry and audience.
          </p>
          <Button className="gap-2" asChild>
            <Link href="/register">
              Get Started Free <ArrowRight weight="bold" className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </LandingPageShell>
  );
}
