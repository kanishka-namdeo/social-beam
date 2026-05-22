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
  title: "Buffer Alternative — Free Social Media Scheduler | SocialBeam",
  description:
    "Looking for a Buffer alternative? SocialBeam offers free unlimited scheduling with AI-powered content creation. Migrate in minutes.",
};

const otherComparisons = [
  { name: "Hootsuite", slug: "hootsuite" },
  { name: "Sprout Social", slug: "sprout-social" },
  { name: "Later", slug: "later" },
  { name: "Metricool", slug: "metricool" },
];

const comparisonRows = [
  { feature: "Monthly pricing", buffer: "$6–$120/mo", socialbeam: "Free" },
  { feature: "Social accounts", buffer: "3 (Basic)", socialbeam: "10" },
  { feature: "Scheduled posts", buffer: "10 (Free) / 200+ (Paid)", socialbeam: "Unlimited" },
  { feature: "AI content creation", buffer: "No", socialbeam: "Yes" },
  { feature: "Brand voice training", buffer: "No", socialbeam: "Yes (AI plans)" },
  { feature: "Analytics", buffer: "Basic", socialbeam: "Advanced" },
  { feature: "Visual calendar", buffer: "Yes", socialbeam: "Yes" },
  { feature: "Supported platforms", buffer: "6", socialbeam: "6" },
  { feature: "Team collaboration", buffer: "Yes (Business)", socialbeam: "Yes (AI Pro+)" },
  { feature: "Content recycling", buffer: "No", socialbeam: "Yes" },
];

const faqs = [
  {
    question: "Is SocialBeam really free?",
    answer:
      "Yes. SocialBeam's Free plan includes 10 social accounts, unlimited scheduled posts, a visual calendar, and basic analytics — no credit card required. AI features are available on paid plans starting at $19/mo.",
  },
  {
    question: "Can I import my scheduled posts from Buffer?",
    answer:
      "Yes. Our migration tool imports your Buffer scheduled posts, connected accounts, and publishing schedule. The process takes just a few minutes — no data loss or downtime.",
  },
  {
    question: "What about Buffer's queue feature?",
    answer:
      "SocialBeam's visual calendar and smart scheduling replace Buffer's queue. AI suggests optimal posting times based on your audience's activity patterns, giving you better results than a static queue.",
  },
  {
    question: "Do you support all the same platforms as Buffer?",
    answer:
      "SocialBeam supports Instagram, Facebook, X (Twitter), LinkedIn, TikTok, and Pinterest — the same core platforms Buffer covers. We also plan to expand to 20+ platforms in Phase 3.",
  },
];

export default function BufferComparisonPage() {
  return (
    <LandingPageShell
      hero={{
        title: "The Buffer alternative that's actually free",
        description:
          "Buffer caps you at 3 channels for $6/mo. SocialBeam gives you 10 accounts, unlimited posts, and AI content creation — free forever.",
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
              The short version: SocialBeam gives you more for free than Buffer charges for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">Buffer</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    $6/mo for just 3 channels (Basic)
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    $120/mo for advanced analytics (Business)
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    No AI content creation
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    10 scheduled posts on free plan
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
                    Unlimited scheduled posts
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    AI content creation ($19/mo+)
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Advanced analytics included
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
              <TableHead>Buffer</TableHead>
              <TableHead className="text-brand">SocialBeam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.feature}>
                <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                <TableCell className="text-muted-foreground">{row.buffer}</TableCell>
                <TableCell className="font-medium text-foreground">{row.socialbeam}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pricing data sourced from Buffer.com and SocialBeam pricing as of May 2026.
        </p>
      </div>

      {/* Why Switch */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why switch from Buffer?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-destructive/10 text-destructive">Limited free plan</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Buffer&apos;s free plan caps you at 10 scheduled posts across 3 channels. SocialBeam gives you unlimited posts across 10 accounts &mdash; completely free.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-warning/10 text-warning">No AI features</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Buffer has no built-in AI content creation. SocialBeam generates captions, hashtags, and posting suggestions with AI — no third-party tools needed.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">Bare-bones analytics</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Buffer&apos;s analytics are basic even on paid plans. SocialBeam provides cross-platform analytics, best-time-to-post insights, and AI-powered performance recommendations.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Migration Guide */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Migrate from Buffer in 3 steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">1</div>
              <CardTitle className="text-foreground">Export from Buffer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Use Buffer&apos;s export tool or our one-click importer to pull your scheduled posts, account connections, and publishing history.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">2</div>
              <CardTitle className="text-foreground">Connect to SocialBeam</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Link your social accounts via OAuth. Our importer automatically maps Buffer channels to SocialBeam accounts and preserves your schedule.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">3</div>
              <CardTitle className="text-foreground">Start publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Review your imported schedule, enable AI suggestions for better posting times, and hit publish. Done — no downtime.
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
          Switch from Buffer today. Get 10 accounts, unlimited posts, and AI-powered features — free forever.
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
