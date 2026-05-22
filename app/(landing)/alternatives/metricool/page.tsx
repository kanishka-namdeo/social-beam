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
  title: "Metricool Alternative — Social Media Scheduler with AI | SocialBeam",
  description:
    "Metricool is affordable but lacks AI features. SocialBeam adds AI content creation and actionable insights — still free.",
};

const otherComparisons = [
  { name: "Buffer", slug: "buffer" },
  { name: "Hootsuite", slug: "hootsuite" },
  { name: "Sprout Social", slug: "sprout-social" },
  { name: "Later", slug: "later" },
];

const comparisonRows = [
  { feature: "Monthly pricing", metricool: "$0–$18/mo", socialbeam: "Free" },
  { feature: "Social accounts", metricool: "1 (Free) / 10 (Pro)", socialbeam: "10" },
  { feature: "Scheduled posts", metricool: "50 (Free) / Unlimited (Pro)", socialbeam: "Unlimited" },
  { feature: "AI content creation", metricool: "No", socialbeam: "Yes" },
  { feature: "AI insights", metricool: "No", socialbeam: "Yes" },
  { feature: "Analytics depth", metricool: "Good", socialbeam: "Advanced + AI" },
  { feature: "Visual calendar", metricool: "Yes", socialbeam: "Yes" },
  { feature: "Supported platforms", metricool: "10+", socialbeam: "6" },
  { feature: "Brand voice training", metricool: "No", socialbeam: "Yes (AI plans)" },
  { feature: "Client approval", metricool: "No", socialbeam: "Yes" },
];

const faqs = [
  {
    question: "Is Metricool cheaper than SocialBeam?",
    answer:
      "Metricool's free plan is limited to 1 brand and 50 posts/month. Their Pro plan is $18/mo for 10 brands. SocialBeam's free plan includes 10 accounts and unlimited posts — so for most users, SocialBeam is both more generous and free.",
  },
  {
    question: "Does Metricool have any AI features?",
    answer:
      "No. Metricool focuses on scheduling and analytics but has no AI content creation, caption generation, or smart suggestions. SocialBeam's AI writes platform-optimized captions, generates hashtags, and recommends the best posting times.",
  },
  {
    question: "Which has better analytics — Metricool or SocialBeam?",
    answer:
      "Metricool provides solid basic analytics. SocialBeam goes further with cross-platform aggregation, best-time-to-post AI, content performance predictions, and actionable recommendations. For data-driven teams, SocialBeam's analytics are more actionable.",
  },
  {
    question: "Can I migrate from Metricool easily?",
    answer:
      "Yes. Export your Metricool scheduled posts and use our import tool to bring them into SocialBeam. The process preserves your calendar, account connections, and posting schedule — no downtime or data loss.",
  },
];

export default function MetricoolComparisonPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Metricool's price. With AI-powered features.",
        description:
          "Metricool is affordable but lacks AI. SocialBeam adds AI content creation, smart analytics, and actionable insights — and it's still free.",
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
              The short version: SocialBeam matches Metricool&apos;s affordability and adds AI features it doesn&apos;t have.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">Metricool</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    No AI content creation
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    Basic analytics without insights
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    Less polished UI and UX
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    50 posts/month on free plan
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-brand text-sm uppercase tracking-wide">SocialBeam</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    AI content creation built-in
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Advanced analytics + AI insights
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Modern, intuitive interface
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Unlimited posts, always free
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
              <TableHead>Metricool</TableHead>
              <TableHead className="text-brand">SocialBeam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.feature}>
                <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                <TableCell className="text-muted-foreground">{row.metricool}</TableCell>
                <TableCell className="font-medium text-foreground">{row.socialbeam}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pricing data sourced from Metricool.com and SocialBeam pricing as of May 2026.
        </p>
      </div>

      {/* Why Switch */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why switch from Metricool?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-destructive/10 text-destructive">No AI content creation</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Metricool is purely a scheduling tool &mdash; no AI caption generation, no hashtag suggestions, no content ideation. SocialBeam&apos;s AI writes platform-optimized copy and suggests improvements in real time.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-warning/10 text-warning">Basic analytics</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Metricool shows you the numbers but doesn&apos;t tell you what to do with them. SocialBeam adds AI-powered insights: best times to post, content performance predictions, and actionable recommendations.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">Less polished UI</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Metricool&apos;s interface is functional but dated. SocialBeam features a modern, responsive design with a clean visual calendar, drag-and-drop scheduling, and an intuitive compose experience.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Migration Guide */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Migrate from Metricool in 3 steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">1</div>
              <CardTitle className="text-foreground">Export your Metricool schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Download your scheduled posts from Metricool&apos;s calendar view. Our importer also supports CSV exports for bulk migration.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">2</div>
              <CardTitle className="text-foreground">Link your social accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Connect via secure OAuth. SocialBeam supports the same platforms as Metricool: Instagram, Facebook, X, LinkedIn, TikTok, Pinterest, and more.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-full bg-brand text-background flex items-center justify-center font-bold text-sm mb-3">3</div>
              <CardTitle className="text-foreground">Upgrade with AI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Import your schedule, enable AI suggestions, and let SocialBeam optimize your posting times and content. Your calendar runs immediately.
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
          Keep the affordability. Add AI content creation, smarter analytics, and unlimited posts — all free.
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
