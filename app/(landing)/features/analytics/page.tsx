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
  ChartBar,
  Sparkle,
  Clock,
  TrendUp,
  ChartPie,
  ArrowRight,
  Target,
  Brain,
  Globe,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Social Media Analytics Tool — AI-Powered Insights | SocialBeam",
  description:
    "Natural language analytics that tell you what to do next. Cross-platform performance tracking, optimal posting times, and AI recommendations.",
};

const features = [
  {
    icon: Sparkle,
    title: "AI Insights",
    description:
      "Get plain-English analysis of your performance. AI tells you what's working, what's not, and exactly what to adjust.",
  },
  {
    icon: ChartBar,
    title: "Cross-Platform Metrics",
    description:
      "Track engagement, reach, and growth across Instagram, X, LinkedIn, Facebook, TikTok, and Pinterest in one unified dashboard.",
  },
  {
    icon: Clock,
    title: "Optimal Posting Times",
    description:
      "AI analyzes your audience activity patterns to recommend the best times to post on each platform for maximum engagement.",
  },
  {
    icon: TrendUp,
    title: "Audience Growth Tracking",
    description:
      "Monitor follower growth rates, identify spikes and dips, and correlate them with your content strategy.",
  },
  {
    icon: ChartPie,
    title: "Content Ranking",
    description:
      "See which posts performed best and why. Understand patterns in your top content to replicate success.",
  },
  {
    icon: Target,
    title: "Confidence Correlation",
    description:
      "Premium feature that correlates your posting confidence scores with actual performance to calibrate your strategy.",
  },
  {
    icon: Brain,
    title: "Publishing Reliability",
    description:
      "Track your posting consistency with streak tracking and reliability scores. AI nudges you when you fall off schedule.",
  },
  {
    icon: Globe,
    title: "Platform Comparison",
    description:
      "Compare performance across platforms side-by-side. Identify where your audience is most engaged and allocate effort accordingly.",
  },
];

const benefits = [
  {
    title: "Stop guessing, start knowing",
    description: "Instead of staring at charts, get clear recommendations: post more carousels, try shorter captions, publish at 2pm on Tuesdays.",
  },
  {
    title: "Cross-platform in one view",
    description: "No more switching between Instagram Insights, X Analytics, and LinkedIn analytics. Everything in one dashboard.",
  },
  {
    title: "Actionable, not overwhelming",
    description: "Most analytics tools show you too much data. SocialBeam distills it into the 2-3 actions that will move the needle.",
  },
  {
    title: "Built for non-analysts",
    description: "You don't need to be a data scientist. If you can read a sentence, you can use SocialBeam analytics.",
  },
];

const faqs = [
  {
    question: "What analytics are included on the free plan?",
    answer:
      "The free plan includes basic analytics: post performance, follower growth, and engagement metrics across all connected platforms. Advanced AI insights and optimal posting times require an AI plan.",
  },
  {
    question: "Can I compare performance across platforms?",
    answer:
      "Yes. SocialBeam shows side-by-side comparisons of engagement rates, follower growth, and content performance across Instagram, X, LinkedIn, Facebook, TikTok, and Pinterest.",
  },
  {
    question: "How does AI suggest optimal posting times?",
    answer:
      "AI analyzes when your audience is most active, when your past posts performed best, and platform-specific engagement patterns to recommend specific times for each account.",
  },
  {
    question: "Can I export analytics reports?",
    answer:
      "Yes. AI Pro and AI Agency plans include exportable reports. Agency plans also get white-label reports you can share directly with clients.",
  },
];

export default function AnalyticsLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Social media analytics that actually tell you what to do",
        description:
          "No more data dumps. AI analyzes your cross-platform performance and gives you clear, actionable recommendations. Free basic analytics included.",
        ctaLabel: "See analytics in action",
        ctaHref: "/register",
      }}
    >
      {/* Benefits */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Why SocialBeam analytics are different
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Most tools show you charts. SocialBeam shows you next steps.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="flex gap-4 p-6 border border-border rounded-sm">
              <div className="w-10 h-10 rounded-sm bg-brand/10 text-brand flex items-center justify-center shrink-0 font-semibold">
                {benefits.indexOf(benefit) + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <ChartBar className="w-6 h-6 text-brand" weight="fill" />
            <Badge variant="outline">Analytics Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to measure and improve
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From basic metrics to AI-powered predictions, SocialBeam covers your entire analytics workflow.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-brand/10 text-brand w-fit mb-3">
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

      {/* FAQ */}
      <div className="mb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Common questions about SocialBeam analytics.
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
          Stop guessing. Start growing with data.
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Get basic analytics free. Upgrade to AI insights for recommendations that actually move the needle.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2 min-w-48">
            Start free — includes basic analytics
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </LandingPageShell>
  );
}
