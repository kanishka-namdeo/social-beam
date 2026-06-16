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
  ShoppingCart,
  Sparkle,
  ArrowRight,
  Calendar,
  ChartBar,
  Users,
  Megaphone,
  Storefront,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Social Media for Ecommerce — Product Launches & Sales | SocialBeam",
  description:
    "Schedule product launches, manage shoppable posts, coordinate influencer campaigns, and track ROI across all social platforms.",
};

const features = [
  {
    icon: ShoppingCart,
    title: "Product Launch Scheduling",
    description:
      "Plan and schedule coordinated product launches across all platforms. Sync countdown posts, reveal day content, and follow-up campaigns.",
  },
  {
    icon: Sparkle,
    title: "AI Product Descriptions",
    description:
      "Generate platform-optimized product posts. AI adapts your product copy for Instagram carousels, X threads, or LinkedIn announcements.",
  },
  {
    icon: ChartBar,
    title: "ROI Tracking",
    description:
      "Connect your social campaigns to sales data. See which posts drive the most traffic and conversions with cross-platform attribution.",
  },
  {
    icon: Users,
    title: "Influencer Coordination",
    description:
      "Manage influencer posting schedules alongside your own content. Ensure coordinated launches and consistent messaging.",
  },
  {
    icon: Megaphone,
    title: "Campaign Management",
    description:
      "Run seasonal campaigns with multiple touchpoints. Track performance by campaign, not just individual posts.",
  },
  {
    icon: Storefront,
    title: "Multi-Location Support",
    description:
      "Manage social accounts for multiple store locations. Schedule location-specific content while maintaining brand consistency.",
  },
];

const workflows = [
  {
    title: "Product launch playbook",
    description: "Pre-built templates for product launches: countdown sequence, launch day blitz, and post-launch follow-up. Just fill in your product details.",
  },
  {
    title: "Seasonal campaign calendar",
    description: "Plan Black Friday, holiday, and seasonal campaigns months in advance. Visual calendar shows your entire quarter at a glance.",
  },
  {
    title: "UGC content pipeline",
    description: "Collect user-generated content, get approvals, and schedule the best submissions. Turn customer posts into your marketing.",
  },
  {
    title: "Sales event coordination",
    description: "Coordinate flash sale announcements across platforms with timed publishing. Every post goes live at the exact right moment.",
  },
];

const faqs = [
  {
    question: "Can SocialBeam schedule shoppable Instagram posts?",
    answer:
      "Yes. Schedule Instagram posts with product tags and shopping features. Connect your Instagram business account and tag products directly in your scheduled posts.",
  },
  {
    question: "Does SocialBeam integrate with Shopify?",
    answer:
      "SocialBeam integrates with ecommerce platforms through Zapier. You can trigger posts from new product listings, sync product catalogs, and automate launch announcements.",
  },
  {
    question: "How does ROI tracking work?",
    answer:
      "SocialBeam correlates your social posts with website traffic and conversion data. AI identifies which content types and platforms drive the most revenue, not just engagement.",
  },
  {
    question: "Can I manage social for multiple store locations?",
    answer:
      "Yes. AI Agency plans support unlimited accounts with client workspaces. Schedule location-specific content while maintaining centralized brand guidelines.",
  },
];

export default function EcommerceLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Social media built for ecommerce",
        description:
          "Launch products, coordinate campaigns, and track social ROI across every platform. Free for up to 10 accounts.",
        ctaLabel: "Start free for your store",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <ShoppingCart className="w-6 h-6 text-brand" weight="fill" />
            <Badge variant="outline">Ecommerce Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to sell on social
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From product launches to seasonal campaigns, SocialBeam handles your entire ecommerce social workflow.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
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

      {/* Workflows */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Pre-built workflows for ecommerce teams
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't start from scratch. SocialBeam includes proven ecommerce social playbooks.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {workflows.map((workflow) => (
            <div key={workflow.title} className="flex gap-4 p-6 border border-border rounded-sm">
              <div className="w-10 h-10 rounded-sm bg-brand/10 text-brand flex items-center justify-center shrink-0 font-semibold">
                {workflows.indexOf(workflow) + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{workflow.title}</h3>
                <p className="text-muted-foreground text-sm">{workflow.description}</p>
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
            Common questions about SocialBeam for ecommerce.
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
          Start selling smarter on social
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Free forever for 10 accounts. AI features to scale your product content when you're ready.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2 min-w-48">
            Get Started Free
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </LandingPageShell>
  );
}
