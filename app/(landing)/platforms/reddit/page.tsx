import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  RedditLogo,
  TrendUp,
  Sparkle,
  Calendar,
  ChartBar,
  ArrowRight,
  Target,
  Brain,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export function generateMetadata(): Metadata {
  return {
    title: "Reddit Scheduler & Trend Discovery — Social Media Tool | SocialBeam",
    description:
      "Discover trending Reddit posts, schedule Reddit content, and turn community discussions into optimized social posts. Free with SocialBeam.",
  };
}

const features = [
  {
    icon: TrendUp,
    title: "Trend Discovery",
    description:
      "Browse trending Reddit posts across thousands of subreddits. AI scores each trend for relevance to your brand and audience.",
  },
  {
    icon: Sparkle,
    title: "AI-Powered Post Generation",
    description:
      "Turn a trending Reddit discussion into platform-optimized posts for X, LinkedIn, Instagram, or Facebook with one click.",
  },
  {
    icon: Target,
    title: "Brand Matching",
    description:
      "Set your brand categories and keywords. SocialBeam filters noise and surfaces only the trends relevant to your niche.",
  },
  {
    icon: Calendar,
    title: "Schedule Reddit-Inspired Content",
    description:
      "Plan and schedule posts inspired by Reddit trends alongside your regular content calendar for a cohesive strategy.",
  },
  {
    icon: Brain,
    title: "Sentiment Analysis",
    description:
      "Understand community sentiment behind each trend. Know whether a discussion is positive, controversial, or neutral before engaging.",
  },
  {
    icon: ChartBar,
    title: "Performance Tracking",
    description:
      "See which Reddit-inspired posts drive the most engagement. Learn what resonates and double down on winning topics.",
  },
];

const bestPractices = [
  {
    title: "Monitor trends daily",
    description: "Reddit moves fast. Check trending topics daily to catch emerging discussions before they go mainstream.",
  },
  {
    title: "Adapt, don't copy",
    description: "Use Reddit trends as inspiration — not content to repost. Rewrite with your brand voice for each platform.",
  },
  {
    title: "Engage authentically",
    description: "If you comment on Reddit directly, be genuine. Redditors can spot marketing from a mile away.",
  },
  {
    title: "Track what works",
    description: "Monitor which Reddit-inspired posts get the most engagement. Build a repeatable playbook around winning topics.",
  },
];

const faqs = [
  {
    question: "Can I schedule posts directly to Reddit?",
    answer:
      "SocialBeam helps you discover trending Reddit content and turn those trends into posts for your other social platforms. Direct Reddit scheduling is in our roadmap.",
  },
  {
    question: "How does trend relevance scoring work?",
    answer:
      "AI analyzes trending Reddit posts against your brand keywords, industry category, and past content performance. Each trend gets a relevance score so you can prioritize the most impactful discussions.",
  },
  {
    question: "Which subreddits does SocialBeam monitor?",
    answer:
      "SocialBeam monitors thousands of active subreddits across all major categories — technology, business, lifestyle, entertainment, and more. You can filter by category or add custom subreddits to track.",
  },
  {
    question: "Is Reddit trend discovery free?",
    answer:
      "Yes. Reddit trend discovery is included with your free SocialBeam account. Connect it to your content workflow and schedule AI-optimized posts based on trending discussions.",
  },
];

export default function RedditLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Discover Reddit trends. Create content that resonates.",
        description:
          "Find what your audience is talking about on Reddit. Turn trending discussions into optimized posts for every platform. Free with SocialBeam.",
        ctaLabel: "Start discovering trends for free",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <RedditLogo className="w-6 h-6 text-preview-reddit" weight="fill" />
            <Badge variant="outline">Reddit Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Reddit trend discovery, built for marketers
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Stop manually browsing Reddit. SocialBeam surfaces the trends that matter to your brand and turns them into content.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-preview-reddit/10 text-preview-reddit w-fit mb-3">
                    <Icon className="w-6 h-6" weight="bold" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Best Practices */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Reddit marketing best practices
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            How to use Reddit trends effectively without coming across as spam.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {bestPractices.map((practice) => (
            <div key={practice.title} className="flex gap-4 p-6 border border-border rounded-sm">
              <div className="w-10 h-10 rounded-sm bg-brand/10 text-brand flex items-center justify-center shrink-0 font-semibold">
                {bestPractices.indexOf(practice) + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{practice.title}</h3>
                <p className="text-muted-foreground text-sm">{practice.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Common questions about Reddit trend discovery with SocialBeam.
          </p>
        </div>

        <Accordion type="single" collapsible>
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* CTA */}
      <div className="text-center py-12 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Turn Reddit trends into your best-performing content
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Stop guessing what to post. Let Reddit tell you what your audience actually cares about.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2 min-w-48">
            Start discovering trends for free
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </LandingPageShell>
  );
}
