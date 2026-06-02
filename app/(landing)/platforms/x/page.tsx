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
  XLogo,
  ThreadsLogo,
  Sparkle,
  Clock,
  ChartBar,
  Repeat,
  ShareNetwork,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export function generateMetadata(): Metadata {
  return {
    title: "X (Twitter) Scheduler — Schedule Tweets in Advance | SocialBeam",
    description:
      "Schedule tweets and threads with AI-powered writing. Find the best times to post. Free social media scheduler for X.",
  };
}

const features = [
  {
    icon: ThreadsLogo,
    title: "Thread Scheduling",
    description:
      "Compose and schedule multi-tweet threads in one flow. Perfect for storytelling, tutorials, and thought leadership content.",
  },
  {
    icon: Sparkle,
    title: "AI Tweet Writing",
    description:
      "Generate engaging tweets that match your brand voice. AI adapts to X's fast-paced style — punchy, concise, and attention-grabbing.",
  },
  {
    icon: Clock,
    title: "Optimal Timing",
    description:
      "AI identifies when your followers are most active and schedules posts for maximum impressions and engagement automatically.",
  },
  {
    icon: ChartBar,
    title: "Engagement Analytics",
    description:
      "Track impressions, likes, retweets, and replies. AI surfaces trends and tells you what content resonates most with your audience.",
  },
  {
    icon: Repeat,
    title: "Content Recycling",
    description:
      "Automatically reshare your best-performing evergreen content at optimal intervals. Keep your feed active without creating new posts daily.",
  },
  {
    icon: ShareNetwork,
    title: "Multi-Account Management",
    description:
      "Manage personal and brand X accounts from one dashboard. Switch between accounts, schedule separately, and maintain distinct brand voices.",
  },
];

const bestPractices = [
  {
    title: "Post 2-5 times daily",
    description: "X moves fast. Consistent posting throughout the day keeps your account visible. Schedule posts across morning, midday, and evening windows.",
  },
  {
    title: "Write threads, not just tweets",
    description: "Threads get significantly more engagement than single tweets. Use them for deeper takes, tutorials, and stories that need more than 280 characters.",
  },
  {
    title: "Engage in real time",
    description: "Schedule your own content but reply to trending conversations in real time. The best growth comes from engaging with bigger accounts in your niche.",
  },
  {
    title: "Use visuals to stand out",
    description: "Tweets with images, GIFs, or videos get 3x more engagement. Always pair your scheduled tweets with media when possible.",
  },
];

const faqs = [
  {
    question: "Can I schedule tweet threads with SocialBeam?",
    answer:
      "Yes. You can compose full tweet threads — multiple connected tweets — and schedule them to publish together. Each tweet in the thread is posted as a reply to the previous one, creating a seamless thread experience.",
  },
  {
    question: "Does AI know how to write good tweets?",
    answer:
      "SocialBeam's AI is trained on high-performing X content patterns. It writes punchy, concise tweets that fit within character limits, uses appropriate hashtags, and matches your established brand voice.",
  },
  {
    question: "Can I schedule posts for multiple X accounts?",
    answer:
      "Yes. Connect multiple X accounts and schedule posts for each independently. The free plan supports up to 10 total social accounts across all platforms.",
  },
  {
    question: "What happens if a scheduled tweet fails to publish?",
    answer:
      "If a tweet fails to publish (e.g., API issues, rate limits), SocialBeam notifies you immediately and provides a retry option. Your content is never lost.",
  },
];

export default function XLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Schedule tweets and threads in advance",
        description:
          "Plan your X strategy weeks ahead. AI writes on-brand tweets and threads, finds optimal posting times, and recycles your best content. Free for up to 10 accounts.",
        ctaLabel: "Start scheduling for free",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <XLogo className="w-6 h-6 text-foreground" weight="fill" />
            <Badge variant="outline">X (Twitter) Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to grow on X
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From thread scheduling to AI-powered tweet writing, SocialBeam helps you maintain a consistent, high-quality presence on X.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-foreground/10 text-foreground w-fit mb-3">
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
            X growth best practices for 2026
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Data-backed strategies to maximize your reach, engagement, and follower growth on X.
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
            Common questions about scheduling X posts with SocialBeam.
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
          Ready to grow your X presence on autopilot?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Join thousands of creators and brands who save hours every week with AI-powered X scheduling.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2 min-w-48">
            Start scheduling for free
          </Button>
        </Link>
      </div>
    </LandingPageShell>
  );
}
