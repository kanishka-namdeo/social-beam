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
  BuildingOffice,
  Sparkle,
  ArrowRight,
  Users,
  FileText,
  ChartBar,
  Calendar,
  Lock,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Social Media Management for Agencies — White Label & Client Tools | SocialBeam",
  description:
    "Manage unlimited clients from one dashboard. White-label reports, client workspaces, team permissions, and bulk scheduling.",
};

const features = [
  {
    icon: Users,
    title: "Client Workspaces",
    description:
      "Isolate each client's accounts, content, and analytics. Teams only see the workspaces they're assigned to.",
  },
  {
    icon: FileText,
    title: "White-Label Reports",
    description:
      "Generate branded analytics reports with your agency logo. Share PDF or interactive dashboards directly with clients.",
  },
  {
    icon: ChartBar,
    title: "Cross-Client Analytics",
    description:
      "Compare performance across all your clients at a glance. Identify patterns, benchmark accounts, and prove your value.",
  },
  {
    icon: Calendar,
    title: "Bulk Scheduling",
    description:
      "Schedule content for multiple clients simultaneously. Queue entire weeks of posts in minutes, not hours.",
  },
  {
    icon: Lock,
    title: "Role-Based Permissions",
    description:
      "Control who can publish, approve, or manage billing per workspace. Freelancers get different access than account managers.",
  },
  {
    icon: Sparkle,
    title: "AI at Scale",
    description:
      "Generate content for multiple clients with AI trained on each brand's voice. One AI engine, unlimited brand personalities.",
  },
];

const benefits = [
  {
    title: "Replace 3-4 tools with one",
    description: "Most agencies use separate tools for scheduling, analytics, reporting, and AI content. SocialBeam replaces them all.",
  },
  {
    title: "Scale without hiring",
    description: "AI handles the content creation and scheduling that would require junior hires. Manage 20 clients with the same team.",
  },
  {
    title: "White-label everything",
    description: "Reports, dashboards, and even the login experience can be branded with your agency identity. Your clients never see SocialBeam.",
  },
  {
    title: "Built for client turnover",
    description: "Onboard new clients in minutes, offboard departing ones instantly. Workspace isolation means no data bleeds between accounts.",
  },
];

const faqs = [
  {
    question: "How many clients can I manage on the Agency plan?",
    answer:
      "Unlimited. The AI Agency plan supports unlimited social accounts across unlimited client workspaces. You pay one flat $149/mo regardless of client count.",
  },
  {
    question: "Can clients see their own analytics?",
    answer:
      "Yes. Each client workspace has its own analytics dashboard. Share read-only access with clients or send white-label PDF reports on your schedule.",
  },
  {
    question: "Is there an SLA for the Agency plan?",
    answer:
      "Yes. AI Agency plans include an SLA guarantee with 99.9% uptime, priority support response within 4 hours, and a dedicated account manager.",
  },
  {
    question: "Can I white-label the entire experience?",
    answer:
      "AI Agency plans support custom branding on reports and dashboards. Custom domain login and full white-label options are available for enterprise agency agreements.",
  },
  {
    question: "How does team collaboration work across clients?",
    answer:
      "Assign team members to specific client workspaces. An account manager for Client A won't see Client B's content unless explicitly granted access.",
  },
];

export default function AgencyLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "The social media tool built for agencies",
        description:
          "Manage unlimited clients from one dashboard. White-label reports, isolated workspaces, and AI that learns each brand's voice. $149/mo flat.",
        ctaLabel: "Start your agency trial",
        ctaHref: "/register",
      }}
    >
      {/* Benefits */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Why agencies choose SocialBeam
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Built from the ground up for agencies managing multiple brands.
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
            <BuildingOffice className="w-6 h-6 text-brand" weight="fill" />
            <Badge variant="outline">Agency Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to manage clients at scale
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From onboarding to reporting, SocialBeam handles your entire agency workflow.
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

      {/* FAQ */}
      <div className="mb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Common questions about SocialBeam for agencies.
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
          Ready to streamline your agency operations?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Unlimited clients. Unlimited accounts. One flat price. Start with a free trial.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2 min-w-48">
            Start your agency trial
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </LandingPageShell>
  );
}
