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
  title: "Hootsuite Alternative — Free Social Media Scheduler | SocialBeam",
  description:
    "Tired of Hootsuite's $249/mo pricing? SocialBeam offers the same features for free, plus AI content creation and smarter analytics.",
};

const otherComparisons = [
  { name: "Buffer", slug: "buffer" },
  { name: "Sprout Social", slug: "sprout-social" },
  { name: "Later", slug: "later" },
  { name: "Metricool", slug: "metricool" },
];

const comparisonRows = [
  { feature: "Monthly pricing", hootsuite: "$249/mo", socialbeam: "Free" },
  { feature: "Social accounts", hootsuite: "10 (Professional)", socialbeam: "10" },
  { feature: "Scheduled posts", hootsuite: "Unlimited", socialbeam: "Unlimited" },
  { feature: "AI content creation", hootsuite: "No (OwlyWriter AI add-on)", socialbeam: "Yes (built-in)" },
  { feature: "Analytics depth", hootsuite: "Advanced (paid)", socialbeam: "Advanced" },
  { feature: "Post failure rate", hootsuite: "~8% (reported)", socialbeam: "<2%" },
  { feature: "Visual calendar", hootsuite: "Yes", socialbeam: "Yes" },
  { feature: "Supported platforms", hootsuite: "15+", socialbeam: "6" },
  { feature: "Team collaboration", hootsuite: "Yes (Enterprise)", socialbeam: "Yes (AI Pro+)" },
  { feature: "Client approval", hootsuite: "No", socialbeam: "Yes" },
];

const faqs = [
  {
    question: "Is SocialBeam really a full Hootsuite replacement?",
    answer:
      "For most teams, yes. SocialBeam covers scheduling, analytics, team collaboration, and AI content creation — everything you need for daily social media management. Hootsuite's broader platform list (15+ vs 6) matters mainly for niche platforms like Reddit or YouTube.",
  },
  {
    question: "How much can I save switching from Hootsuite?",
    answer:
      "Hootsuite Professional costs $249/mo ($2,988/year). SocialBeam's Free plan covers the same 10 accounts with unlimited posts. Even our AI Pro plan at $49/mo saves you $2,400/year.",
  },
  {
    question: "Why did Hootsuite raise prices so much?",
    answer:
      "Hootsuite increased pricing by ~400% since 2022, moving from $49/mo to $249/mo for Professional. They also discontinued their free plan. SocialBeam remains free with generous limits.",
  },
  {
    question: "Can I migrate my Hootsuite streams and schedules?",
    answer:
      "Yes. Our migration tool imports your scheduled posts and account connections from Hootsuite. The process takes a few minutes — your publishing schedule continues without interruption.",
  },
];

export default function HootsuiteComparisonPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Hootsuite features. Without the $249/mo price tag.",
        description:
          "Hootsuite charges $249/mo for 10 accounts. SocialBeam gives you the same 10 accounts, unlimited posts, and AI content creation — completely free.",
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
              The short version: SocialBeam matches Hootsuite&apos;s core features at a fraction of the cost.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">Hootsuite</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    $249/mo for 10 accounts (Professional)
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    ~8% post failure rate reported by users
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    Bloated UI with unused features
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    AI requires separate OwlyWriter add-on
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
                    &lt;2% post failure rate
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Clean, focused interface
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
              <TableHead>Hootsuite</TableHead>
              <TableHead className="text-brand">SocialBeam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.feature}>
                <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                <TableCell className="text-muted-foreground">{row.hootsuite}</TableCell>
                <TableCell className="font-medium text-foreground">{row.socialbeam}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pricing data sourced from Hootsuite.com and SocialBeam pricing as of May 2026.
        </p>
      </div>

      {/* Why Switch */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why switch from Hootsuite?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-destructive/10 text-destructive">400% price increase</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Hootsuite went from $49/mo to $249/mo since 2022 — a 400% increase. They also killed their free plan. SocialBeam stays free with unlimited posts and 10 accounts.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-warning/10 text-warning">Bloated UI</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Hootsuite packs features most teams never use into a complex, slow interface. SocialBeam is purpose-built for social scheduling — clean, fast, and focused on what matters.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">High post failure rate</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Users report ~8% post failure rates with Hootsuite due to API sync issues. SocialBeam&apos;s retry logic and monitoring keep failures under 2%.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Migration Guide */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Migrate from Hootsuite in 3 steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">1</div>
              <CardTitle className="text-foreground">Export your Hootsuite data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Use our Hootsuite importer to pull your scheduled posts, account connections, and publishing calendar. CSV export also supported.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">2</div>
              <CardTitle className="text-foreground">Reconnect your accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Link your social accounts via secure OAuth. Our importer preserves your schedule, time zones, and posting preferences automatically.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">3</div>
              <CardTitle className="text-foreground">Go live with AI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Enable AI-powered posting times and content suggestions. Your schedule runs immediately — no downtime, no missed posts.
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
          Leave Hootsuite&apos;s $249/mo behind. Get the same features, AI-powered content creation, and better reliability &mdash; free.
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
