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
  PinterestLogo,
  PushPin,
  Sparkle,
  MagnifyingGlass,
  Clock,
  ChartLineUp,
  Folders,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export function generateMetadata(): Metadata {
  return {
    title: "Pinterest Scheduler — Schedule Pins in Advance | SocialBeam",
    description:
      "Schedule Pinterest pins and idea pins. AI writes descriptions and tag suggestions. Free Pinterest scheduling tool.",
  };
}

const features = [
  {
    icon: PushPin,
    title: "Pin Scheduling",
    description:
      "Upload images and schedule pins to publish at optimal times. Plan your Pinterest content strategy weeks in advance.",
  },
  {
    icon: Folders,
    title: "Board Management",
    description:
      "Organize scheduled pins into the right boards automatically. Create board schedules that match your content categories.",
  },
  {
    icon: Sparkle,
    title: "AI Description Writing",
    description:
      "Generate compelling pin descriptions optimized for Pinterest SEO. AI writes descriptions that drive clicks and saves.",
  },
  {
    icon: MagnifyingGlass,
    title: "SEO Optimization",
    description:
      "Get keyword recommendations and tag suggestions based on Pinterest search trends. Make your pins discoverable to millions of active users.",
  },
  {
    icon: ChartLineUp,
    title: "Pin Analytics",
    description:
      "Track pin impressions, clicks, saves, and outbound traffic. AI identifies your top-performing pins and content themes.",
  },
  {
    icon: Clock,
    title: "Smart Posting Schedule",
    description:
      "AI recommends optimal pinning times based on when your audience is browsing Pinterest. Maximize impressions without manual timing.",
  },
];

const bestPractices = [
  {
    title: "Pin consistently every day",
    description: "Aim for 5-15 pins per day spread across different boards. Pinterest favors accounts with consistent daily activity.",
  },
  {
    title: "Optimize descriptions with keywords",
    description: "Pinterest is a visual search engine. Use keyword-rich descriptions in your pins and boards to improve discoverability.",
  },
  {
    title: "Create idea pins, not just standard pins",
    description: "Idea pins (multi-page visual content) get prioritized in feeds. Use them for tutorials, recipes, and step-by-step guides.",
  },
  {
    title: "Join group boards and create themed boards",
    description: "Well-organized, niche-specific boards perform better. Create boards around specific topics and pin consistently to each one.",
  },
];

const faqs = [
  {
    question: "Can I schedule Pinterest pins in advance with SocialBeam?",
    answer:
      "Yes. Upload your pin images, write or generate descriptions, select the target board, and schedule pins to publish at your chosen times. SocialBeam handles the publishing automatically.",
  },
  {
    question: "Does AI write descriptions optimized for Pinterest SEO?",
    answer:
      "Absolutely. SocialBeam's AI understands Pinterest's search-based discovery model. It writes descriptions with relevant keywords, compelling calls-to-action, and appropriate tags to maximize pin discoverability.",
  },
  {
    question: "Can I schedule pins to multiple boards?",
    answer:
      "Yes. When scheduling a pin, you can assign it to one or more relevant boards. SocialBeam also helps you organize pins into board schedules based on content categories.",
  },
  {
    question: "How does Pinterest scheduling compare to native pinning?",
    answer:
      "SocialBeam uses Pinterest's official API, so scheduled pins are published exactly as if you pinned them manually. There is no algorithmic penalty for using a scheduling tool — your pins get the same reach and engagement.",
  },
];

export default function PinterestLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Schedule Pinterest pins in advance",
        description:
          "Plan your Pinterest content calendar weeks ahead. AI writes SEO-optimized descriptions, suggests tags, and finds optimal pinning times. Free for up to 10 accounts.",
        ctaLabel: "Start scheduling for free",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <PinterestLogo className="w-6 h-6 text-destructive" weight="fill" />
            <Badge variant="outline">Pinterest Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to grow on Pinterest
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From pin scheduling to AI-powered SEO optimization, SocialBeam helps you maintain a consistent Pinterest strategy that drives traffic.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-destructive/10 text-destructive w-fit mb-3">
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
            Pinterest growth best practices
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Proven strategies to maximize your pin impressions and outbound traffic in 2026.
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
            Common questions about scheduling Pinterest pins with SocialBeam.
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
          Ready to grow your Pinterest traffic on autopilot?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Join thousands of creators and businesses who save hours every week with AI-powered Pinterest scheduling.
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
