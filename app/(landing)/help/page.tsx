import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  MagnifyingGlass,
  RocketLaunch,
  CalendarCheck,
  Sparkle,
  CreditCard,
  PlugsConnected,
  ArrowRight,
  ChatsCircle,
  BookOpen,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Help Center — SocialBeam Support",
  description:
    "Find answers to common questions about SocialBeam. Get started with scheduling, AI features, and account management.",
};

const categories = [
  {
    title: "Getting Started",
    description: "Create your account, connect platforms, and publish your first post.",
    icon: RocketLaunch,
    articles: ["Creating your account", "Connecting social media accounts", "Navigating the dashboard"],
  },
  {
    title: "Scheduling",
    description: "Plan, schedule, and queue posts across all your connected platforms.",
    icon: CalendarCheck,
    articles: ["Creating a post", "Using the content calendar", "Bulk scheduling posts"],
  },
  {
    title: "AI Features",
    description: "Generate captions, analyze performance, and optimize posting times with AI.",
    icon: Sparkle,
    articles: ["Using AI caption generation", "Brand voice training", "AI content recommendations"],
  },
  {
    title: "Account & Billing",
    description: "Manage your subscription, billing details, and team members.",
    icon: CreditCard,
    articles: ["Upgrade your plan", "Manage team members", "View billing history"],
  },
  {
    title: "Integrations",
    description: "Connect SocialBeam with your favorite tools and platforms.",
    icon: PlugsConnected,
    articles: ["OAuth setup guide", "Webhook configuration", "API access keys"],
  },
];

const popularArticles = [
  "How to connect Instagram to SocialBeam",
  "Understanding AI credit usage",
  "Setting up your first content calendar",
  "How to schedule posts in bulk",
  "Troubleshooting failed publishes",
];

export default function HelpPage() {
  return (
    <LandingPageShell
      hero={{
        title: "How can we help?",
        description: "Search our knowledge base or browse categories below.",
        ctaLabel: "Get Started Free",
        ctaHref: "/register",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Search Bar */}
        <Card className="border-border">
          <CardContent className="pt-6">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search for articles..."
                className="pl-10 h-12 text-base"
                aria-label="Search help articles"
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Category Cards */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-6">Browse by category</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Card key={cat.title} className="border-border hover:border-brand/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand" />
                      </div>
                      <CardTitle className="text-base text-foreground">{cat.title}</CardTitle>
                    </div>
                    <CardDescription className="text-muted-foreground">{cat.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {cat.articles.map((article) => (
                        <li key={article}>
                          <Link
                            href={`/help/${cat.title.toLowerCase().replace(/\s+/g, "-")}/${article.toLowerCase().replace(/\s+/g, "-")}`}
                            className="text-sm text-muted-foreground hover:text-brand transition-colors"
                          >
                            {article}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Popular Articles */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Popular articles</h2>
          <Card className="border-border">
            <CardContent className="pt-6">
              <ul className="space-y-3">
                {popularArticles.map((article, i) => (
                  <li key={article} className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs min-w-8 justify-center">
                      {i + 1}
                    </Badge>
                    <Link href="/help" className="text-sm text-muted-foreground hover:text-brand transition-colors">
                      {article}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Still Need Help */}
        <Card className="border-border bg-muted/30 text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <ChatsCircle className="w-12 h-12 text-brand mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">Still need help?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Our support team is here to help. Reach out and we will get back to you as soon as possible.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/contact">
                <Button className="gap-2">
                  Contact us
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/help/getting-started">
                <Button variant="outline" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Read the docs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </LandingPageShell>
  );
}
