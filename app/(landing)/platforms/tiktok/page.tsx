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
  TiktokLogo,
  VideoCamera,
  Sparkle,
  Hash,
  Clock,
  ChartLineUp,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export function generateMetadata(): Metadata {
  return {
    title: "TikTok Scheduler — Schedule TikTok Videos | SocialBeam",
    description:
      "Schedule TikTok videos in advance. AI writes captions and hashtag suggestions. Free TikTok scheduling tool.",
  };
}

const features = [
  {
    icon: VideoCamera,
    title: "Video Scheduling",
    description:
      "Upload TikTok videos and schedule them to publish at optimal times. Plan your content calendar weeks ahead without logging in daily.",
  },
  {
    icon: Sparkle,
    title: "AI Caption Writing",
    description:
      "Generate engaging TikTok captions that grab attention in the first line. AI adapts to trending formats and your unique brand voice.",
  },
  {
    icon: Hash,
    title: "Hashtag Research",
    description:
      "Get data-driven hashtag recommendations based on your content niche. Mix trending and evergreen tags for maximum discoverability.",
  },
  {
    icon: Clock,
    title: "Optimal Posting Times",
    description:
      "AI analyzes your audience's viewing patterns to recommend the best times to post, maximizing views and engagement on the For You page.",
  },
  {
    icon: ChartLineUp,
    title: "Performance Insights",
    description:
      "Track video views, engagement rates, follower growth, and trending content. AI tells you what is working and why.",
  },
  {
    icon: VideoCamera,
    title: "Bulk Upload Support",
    description:
      "Upload multiple videos at once and schedule them across different days and times. Perfect for content batch creation sessions.",
  },
];

const bestPractices = [
  {
    title: "Post 1-3 times per day",
    description: "TikTok rewards high-frequency posting. Schedule multiple videos per day to increase your chances of hitting the For You page.",
  },
  {
    title: "Hook viewers in 3 seconds",
    description: "The first 3 seconds determine whether viewers stay. Start with action, a bold statement, or a question — never a slow intro.",
  },
  {
    title: "Use trending sounds strategically",
    description: "Pair your scheduled videos with trending sounds to boost discoverability. SocialBeam's hashtag research complements this strategy.",
  },
  {
    title: "Post when your audience is active",
    description: "TikTok engagement varies wildly by time of day. Use SocialBeam's AI-recommended posting windows to hit peak viewing hours.",
  },
];

const faqs = [
  {
    question: "Can I schedule TikTok videos with SocialBeam?",
    answer:
      "Yes. Upload your TikTok videos, write or generate captions, add hashtags, and schedule them to publish at your chosen time. SocialBeam handles the publishing automatically.",
  },
  {
    question: "Does AI write captions that work on TikTok?",
    answer:
      "Absolutely. SocialBeam's AI understands TikTok's fast-paced content style. It writes short, punchy captions that complement your video content and encourage engagement.",
  },
  {
    question: "Can I schedule multiple TikTok videos at once?",
    answer:
      "Yes. Upload multiple videos in a batch session and schedule each one independently across different dates and times. This is perfect for creators who film in batches.",
  },
  {
    question: "How does TikTok scheduling compare to posting natively?",
    answer:
      "SocialBeam uses TikTok's official Content Posting API, so scheduled posts are published exactly as if you posted them manually. There is no algorithmic penalty for using a scheduling tool.",
  },
];

export default function TikTokLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Schedule TikTok videos in advance",
        description:
          "Plan your TikTok content calendar weeks ahead. AI writes captions, suggests hashtags, and finds optimal posting times. Free for up to 10 accounts.",
        ctaLabel: "Start scheduling for free",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <TiktokLogo className="w-6 h-6 text-foreground" weight="fill" />
            <Badge variant="outline">TikTok Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to grow on TikTok
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From video scheduling to AI-powered hashtag research, SocialBeam helps you maintain a consistent posting schedule that gets results.
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
            TikTok growth best practices
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Proven strategies to maximize your For You page reach and follower growth in 2026.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {bestPractices.map((practice) => (
            <div key={practice.title} className="flex gap-4 p-6 border border-border rounded-lg">
              <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 font-semibold">
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
            Common questions about scheduling TikTok videos with SocialBeam.
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
          Ready to grow your TikTok audience on autopilot?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Join thousands of creators who save hours every week with AI-powered TikTok scheduling.
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
