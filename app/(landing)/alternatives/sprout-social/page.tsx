import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, ArrowRight, Lightning } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Sprout Social Alternative — Affordable Social Media Tool | SocialBeam",
  description:
    "Sprout Social starts at $249/seat. SocialBeam gives you AI-powered scheduling and analytics for free. Switch in minutes.",
};

const otherComparisons = [
  { name: "Buffer", slug: "buffer" },
  { name: "Hootsuite", slug: "hootsuite" },
  { name: "Later", slug: "later" },
  { name: "Metricool", slug: "metricool" },
];

const comparisonRows = [
  { feature: "Monthly pricing", sprout: "$249/seat", socialbeam: "Free" },
  { feature: "Social accounts", sprout: "5 (Standard)", socialbeam: "10" },
  { feature: "Scheduled posts", sprout: "Unlimited", socialbeam: "Unlimited" },
  { feature: "AI content creation", sprout: "No", socialbeam: "Yes" },
  { feature: "Analytics depth", sprout: "Enterprise-grade", socialbeam: "Advanced" },
  { feature: "Team seats", sprout: "Per-seat pricing ($249 each)", socialbeam: "Unlimited (AI Pro+)" },
  { feature: "Visual calendar", sprout: "Yes", socialbeam: "Yes" },
  { feature: "Supported platforms", sprout: "7", socialbeam: "6" },
  { feature: "CRM / inbox", sprout: "Yes (Social Inbox)", socialbeam: "Planned (Phase 2)" },
  { feature: "Client approval", sprout: "No", socialbeam: "Yes" },
];

const faqs = [
  {
    question: "Can SocialBeam really replace Sprout Social?",
    answer:
      "For scheduling, analytics, and AI content creation — yes. Sprout Social's Social Inbox (unified DMs/comments) is its main differentiator, which SocialBeam plans to add in Phase 2. For most teams focused on publishing and analytics, SocialBeam covers everything at a fraction of the cost.",
  },
  {
    question: "How much does Sprout Social cost for a team of 5?",
    answer:
      "At $249 per seat, a 5-person team pays $1,245/mo ($14,940/year). SocialBeam's AI Pro plan at $49/mo covers unlimited team members — saving you over $14,000/year.",
  },
  {
    question: "Why is Sprout Social so expensive?",
    answer:
      "Sprout Social targets enterprise customers with per-seat pricing, premium support, and advanced CRM features. For small and mid-size teams, this pricing model is overkill. SocialBeam serves the same core needs without the enterprise markup.",
  },
  {
    question: "Can I import my Sprout Social data?",
    answer:
      "Yes. Export your scheduled posts and analytics reports from Sprout Social, then use our import tool to bring them into SocialBeam. The process takes just a few minutes.",
  },
];

export default function SproutSocialComparisonPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Sprout Social features. A fraction of the cost.",
        description:
          "Sprout Social costs $249 per seat. SocialBeam gives your entire team access to AI-powered scheduling, advanced analytics, and unlimited posts — free.",
        ctaLabel: "Start Free — No Credit Card Required",
        ctaHref: "/register",
      }}
    >
      {/* TL;DR Summary */}
      <div className="max-w-4xl mx-auto mb-16">
        <Card className="border-brand/50 bg-brand/5">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Lightning className="w-5 h-5 text-brand" />
              Quick comparison
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              The short version: SocialBeam delivers the scheduling and analytics you need without the per-seat pricing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">Sprout Social</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    $249 per seat per month
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    Enterprise-only focus and pricing
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    Complex onboarding for new users
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    No built-in AI content creation
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-brand text-sm uppercase tracking-wide">SocialBeam</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Free for 10 social accounts
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Built for teams of all sizes
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Simple setup in under 5 minutes
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    AI content creation built-in
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Feature comparison</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Feature</TableHead>
              <TableHead>Sprout Social</TableHead>
              <TableHead className="text-brand">SocialBeam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.feature}>
                <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                <TableCell className="text-muted-foreground">{row.sprout}</TableCell>
                <TableCell className="font-medium text-foreground">{row.socialbeam}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pricing data sourced from SproutSocial.com and SocialBeam pricing as of May 2026.
        </p>
      </div>

      {/* Why Switch */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why switch from Sprout Social?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-destructive/10 text-destructive">Per-seat pricing</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                At $249/seat, adding a team member costs $2,988/year. SocialBeam includes unlimited team members on AI Pro and AI Agency plans — no per-seat charges.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-warning/10 text-warning">Enterprise-only focus</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Sprout Social is built for large enterprises with complex needs. Small and mid-size teams pay the same premium for features they&apos;ll never use. SocialBeam is purpose-built for teams of 1\u201350.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">Complex onboarding</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Sprout Social requires dedicated onboarding calls and training for new users. SocialBeam is self-serve — set up accounts, schedule your first post, and enable AI in under 5 minutes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Migration Guide */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Migrate from Sprout Social in 3 steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-sm bg-brand text-background flex items-center justify-center font-semibold text-sm mb-3">1</div>
              <CardTitle className="text-foreground">Export your Sprout Social data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Download your scheduled posts, publishing calendar, and account list from Sprout Social&apos;s export settings or reports section.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-sm bg-brand text-background flex items-center justify-center font-semibold text-sm mb-3">2</div>
              <CardTitle className="text-foreground">Import to SocialBeam</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Upload your export file to SocialBeam&apos;s importer. We automatically map accounts, preserve your schedule, and set up your calendar.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-sm bg-brand text-background flex items-center justify-center font-semibold text-sm mb-3">3</div>
              <CardTitle className="text-foreground">Invite your team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Add team members with a single invite link. No per-seat charges, no approval process. Everyone gets full access immediately.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently asked questions</h2>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-foreground">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Compare with other tools */}
      <div className="max-w-4xl mx-auto mb-16">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Compare with other tools</CardTitle>
            <CardDescription className="text-muted-foreground">
              See how SocialBeam stacks up against your current tool.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {otherComparisons.map((c) => (
                <Link key={c.slug} href={`/alternatives/${c.slug}`}>
                  <Button variant="outline" size="sm">
                    {c.name} comparison
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h2 className="text-3xl font-bold text-foreground">Start free — no credit card required</h2>
        <p className="text-lg text-muted-foreground">
          Stop paying $249/seat. Get AI-powered scheduling, advanced analytics, and unlimited team access — free forever.
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
