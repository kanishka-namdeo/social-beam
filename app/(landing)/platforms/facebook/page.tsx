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
  FacebookLogo,
  Calendar,
  Sparkle,
  DeviceMobile,
  ChartBar,
  Eye,
  Clock,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export function generateMetadata(): Metadata {
  return {
    title: "Facebook Scheduler — Schedule Page Posts | SocialBeam",
    description:
      "Schedule Facebook page posts and stories in advance. AI writes engaging captions. Free Facebook scheduling tool.",
  };
}

const features = [
  {
    icon: Calendar,
    title: "Page Post Scheduling",
    description:
      "Schedule posts to your Facebook page with text, images, videos, or links. Plan your content calendar weeks in advance.",
  },
  {
    icon: DeviceMobile,
    title: "Story Scheduling",
    description:
      "Plan and schedule Facebook Stories in advance. Keep your stories fresh and engaging without manually posting every day.",
  },
  {
    icon: Sparkle,
    title: "AI Caption Writing",
    description:
      "Generate engaging Facebook captions that spark conversation. AI adapts tone for community building, promotions, and announcements.",
  },
  {
    icon: ChartBar,
    title: "Engagement Tracking",
    description:
      "Monitor likes, comments, shares, and reach for each post. AI identifies trends and recommends content strategies based on your data.",
  },
  {
    icon: Eye,
    title: "Link Preview Optimization",
    description:
      "Preview how shared links will appear on Facebook. Adjust titles and descriptions before publishing to maximize click-through rates.",
  },
  {
    icon: Clock,
    title: "Smart Posting Times",
    description:
      "AI analyzes your page's audience activity to recommend optimal posting windows, maximizing organic reach and engagement.",
  },
];

const bestPractices = [
  {
    title: "Post 1-2 times per day",
    description: "Facebook's algorithm favors consistent, moderate posting. One well-crafted post per day outperforms multiple low-effort posts.",
  },
  {
    title: "Prioritize video content",
    description: "Native Facebook videos get up to 135% more organic reach than photo posts. Schedule a mix of video, image, and text posts.",
  },
  {
    title: "Engage with your community",
    description: "Reply to comments on scheduled posts within 2 hours. Active engagement signals boost your page's algorithmic distribution.",
  },
  {
    title: "Use Facebook Groups strategically",
    description: "Share your scheduled page posts in relevant Facebook Groups (where allowed) to extend reach beyond your existing followers.",
  },
];

const faqs = [
  {
    question: "Can I schedule Facebook Stories with SocialBeam?",
    answer:
      "Yes. You can schedule both Facebook page posts and Stories. Upload your Story content, set the publish time, and SocialBeam handles the rest.",
  },
  {
    question: "Does SocialBeam support Facebook Groups posting?",
    answer:
      "Currently, SocialBeam supports scheduling to Facebook Pages. Group posting functionality is on our roadmap and will be available in a future update.",
  },
  {
    question: "Can AI write captions that encourage Facebook engagement?",
    answer:
      "Yes. SocialBeam's AI is trained on high-engagement Facebook content patterns. It writes captions that ask questions, spark discussion, and encourage shares — the key signals Facebook's algorithm rewards.",
  },
  {
    question: "How many Facebook pages can I connect?",
    answer:
      "Connect up to 10 social accounts on the free plan. This includes any mix of Facebook Pages, Instagram accounts, and accounts on other supported platforms.",
  },
];

export default function FacebookLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Schedule Facebook page posts",
        description:
          "Plan page posts and Stories weeks ahead. AI writes engaging captions, finds optimal posting times, and tracks your performance. Free for up to 10 accounts.",
        ctaLabel: "Start scheduling for free",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <FacebookLogo className="w-6 h-6 text-blue-600" weight="fill" />
            <Badge variant="outline">Facebook Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to grow your Facebook page
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From scheduling posts and Stories to AI-powered caption writing, SocialBeam helps you maintain an active, engaging Facebook presence.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-blue-600/10 text-blue-600 w-fit mb-3">
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
            Facebook page growth best practices
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Proven strategies to maximize your Facebook page reach and engagement in 2026.
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
            Common questions about scheduling Facebook posts with SocialBeam.
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
          Ready to grow your Facebook community on autopilot?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Join thousands of page admins who save hours every week with AI-powered Facebook scheduling.
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
