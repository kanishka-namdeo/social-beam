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
  InstagramLogo,
  Calendar,
  Sparkle,
  Hash,
  Clock,
  ChartLineUp,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export function generateMetadata(): Metadata {
  return {
    title: "Instagram Scheduler — Free Social Media Scheduler | SocialBeam",
    description:
      "Schedule Instagram posts, carousels, and Reels in advance. AI writes captions and hashtags. Free for up to 10 accounts.",
  };
}

const features = [
  {
    icon: Calendar,
    title: "Schedule Carousels",
    description:
      "Plan and schedule multi-image carousels in advance. Drag and drop to reorder slides and preview how they will look on your feed.",
  },
  {
    icon: Sparkle,
    title: "AI-Powered Captions",
    description:
      "Generate engaging Instagram captions tailored to your brand voice. AI adapts tone, length, and style for your audience.",
  },
  {
    icon: Hash,
    title: "Smart Hashtag Suggestions",
    description:
      "Get contextually relevant hashtag suggestions based on your content. Mix trending and niche tags for maximum reach.",
  },
  {
    icon: Calendar,
    title: "Visual Content Calendar",
    description:
      "See your entire Instagram content plan at a glance. Preview your grid layout and plan aesthetic consistency weeks ahead.",
  },
  {
    icon: Clock,
    title: "Optimal Posting Times",
    description:
      "AI analyzes your audience activity to recommend the best times to post, delivering 25-40% higher engagement over manual scheduling.",
  },
  {
    icon: ChartLineUp,
    title: "Performance Analytics",
    description:
      "Track which posts perform best, when your audience is most active, and get AI-driven recommendations to grow faster.",
  },
];

const bestPractices = [
  {
    title: "Post consistently",
    description: "Aim for 3-5 posts per week. Consistency matters more than volume — your audience should know when to expect content.",
  },
  {
    title: "Use Reels for reach",
    description: "Reels get up to 22% more engagement than static posts. Mix Reels, carousels, and stories for a balanced strategy.",
  },
  {
    title: "Engage within the first hour",
    description: "Reply to comments and DMs in the first 60 minutes after posting. Early engagement signals boost algorithmic distribution.",
  },
  {
    title: "Write captions that hook",
    description: "The first 125 characters are visible before 'more.' Put your hook upfront and use line breaks for readability.",
  },
];

const faqs = [
  {
    question: "Can I schedule Instagram carousels with SocialBeam?",
    answer:
      "Yes. You can schedule multi-image carousel posts, single images, Reels, and text-only posts. Simply upload your media, arrange the order, write or generate your caption, and pick a publish time.",
  },
  {
    question: "Does SocialBeam support Instagram Reels scheduling?",
    answer:
      "Absolutely. Upload your Reels video, add your caption and hashtags, and schedule it just like any other post. SocialBeam handles the publishing at your chosen time.",
  },
  {
    question: "How many Instagram accounts can I connect for free?",
    answer:
      "SocialBeam's free plan supports up to 10 social media accounts across all platforms. You can mix and match — connect 3 Instagram accounts, 2 TikTok accounts, 5 X accounts, or any combination.",
  },
  {
    question: "Can AI write Instagram captions that match my brand voice?",
    answer:
      "Yes. During onboarding, SocialBeam learns your brand voice from past content or a style guide. AI-generated captions will match your tone, whether it is playful, professional, or somewhere in between.",
  },
];

export default function InstagramLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Schedule Instagram posts in advance",
        description:
          "Plan carousels, Reels, and posts weeks ahead. AI writes on-brand captions and suggests hashtags that grow your reach. Free for up to 10 accounts.",
        ctaLabel: "Start scheduling for free",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <InstagramLogo className="w-6 h-6 text-preview-instagram" weight="fill" />
            <Badge variant="outline">Instagram Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to grow on Instagram
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From scheduling to AI-powered content creation, SocialBeam handles the heavy lifting so you can focus on creating great content.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-preview-instagram/10 text-preview-instagram w-fit mb-3">
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
            Instagram growth best practices
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Proven strategies to maximize your Instagram reach and engagement in 2026.
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
            Common questions about scheduling Instagram posts with SocialBeam.
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
          Ready to streamline your Instagram strategy?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Join thousands of creators who save hours every week with AI-powered Instagram scheduling.
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
