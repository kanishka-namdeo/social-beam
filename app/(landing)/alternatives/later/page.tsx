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
  title: "Later Alternative — Free Social Media Scheduler | SocialBeam",
  description:
    "Later is great for Instagram but weak on other platforms. SocialBeam supports 6 platforms with AI content creation — free forever.",
};

const otherComparisons = [
  { name: "Buffer", slug: "buffer" },
  { name: "Hootsuite", slug: "hootsuite" },
  { name: "Sprout Social", slug: "sprout-social" },
  { name: "Metricool", slug: "metricool" },
];

const comparisonRows = [
  { feature: "Monthly pricing", later: "Free (limited) / $25/mo", socialbeam: "Free" },
  { feature: "Social accounts", later: "1 (Free) / 6 (Starter)", socialbeam: "10" },
  { feature: "Scheduled posts", later: "30/mo (Free)", socialbeam: "Unlimited" },
  { feature: "AI content creation", later: "No", socialbeam: "Yes" },
  { feature: "Instagram support", later: "Excellent", socialbeam: "Full" },
  { feature: "Text platform support", later: "Limited", socialbeam: "Full (X, LinkedIn)" },
  { feature: "Visual calendar", later: "Yes", socialbeam: "Yes" },
  { feature: "Analytics", later: "Basic (Free) / Advanced (Paid)", socialbeam: "Advanced" },
  { feature: "Link in bio tool", later: "Yes (Linkin.bio)", socialbeam: "Planned (Phase 2)" },
  { feature: "User-generated content", later: "Yes", socialbeam: "Planned (Phase 2)" },
];

const faqs = [
  {
    question: "Is Later better for Instagram than SocialBeam?",
    answer:
      "Later is Instagram-first with excellent visual planning and Linkin.bio. SocialBeam also fully supports Instagram (posts, carousels, Reels, Stories) plus 5 other platforms. If Instagram is your only channel, Later is solid. If you need multi-platform scheduling, SocialBeam is the better choice.",
  },
  {
    question: "Can SocialBeam handle Instagram the same way Later does?",
    answer:
      "Yes. SocialBeam supports Instagram posts, carousels, Reels, and Stories scheduling via the Instagram Graph API. You also get AI caption generation, hashtag suggestions, and best-time-to-post optimization — features Later doesn't offer.",
  },
  {
    question: "What about Later's Linkin.bio feature?",
    answer:
      "Linkin.bio is Later's signature feature. SocialBeam plans to add a similar link-in-bio tool in Phase 2. For now, you can continue using Linkin.bio alongside SocialBeam for scheduling.",
  },
  {
    question: "Is SocialBeam's free plan better than Later's?",
    answer:
      "Significantly. Later's free plan caps you at 1 social set and 30 posts per month. SocialBeam's free plan includes 10 accounts and unlimited posts — no monthly limit.",
  },
];

export default function LaterComparisonPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Later for Instagram. SocialBeam for everything.",
        description:
          "Later is great for Instagram but weak on other platforms. SocialBeam supports 6 platforms with AI content creation, advanced analytics, and unlimited posts — free forever.",
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
              The short version: SocialBeam matches Later on Instagram and beats it everywhere else.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">Later</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    Instagram-first, weak on text platforms
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    No AI content creation
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    30 posts/month on free plan
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <X weight="bold" className="w-4 h-4 text-destructive shrink-0" />
                    $25/mo for Starter (6 accounts)
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-brand text-sm uppercase tracking-wide">SocialBeam</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    6 platforms equally supported
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    AI captions, hashtags, and suggestions
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    Unlimited posts, always free
                  </li>
                  <li className="flex items-center gap-2 text-foreground">
                    <Check weight="bold" className="w-4 h-4 text-success shrink-0" />
                    10 accounts on free plan
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
              <TableHead>Later</TableHead>
              <TableHead className="text-brand">SocialBeam</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparisonRows.map((row) => (
              <TableRow key={row.feature}>
                <TableCell className="font-medium text-foreground">{row.feature}</TableCell>
                <TableCell className="text-muted-foreground">{row.later}</TableCell>
                <TableCell className="font-medium text-foreground">{row.socialbeam}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Pricing data sourced from Later.com and SocialBeam pricing as of May 2026.
        </p>
      </div>

      {/* Why Switch */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Why switch from Later?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-destructive/10 text-destructive">Weak on text platforms</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Later is built for visual content. Its X (Twitter) and LinkedIn support is minimal — basic text posts with no threading, no rich previews, and no platform-specific optimization. SocialBeam treats every platform as a first-class citizen.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-warning/10 text-warning">No AI content creation</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Later has no AI caption generation, hashtag suggestions, or content ideation. SocialBeam generates platform-optimized copy, recommends hashtags, and suggests the best times to post — all built in.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-muted text-muted-foreground">Limited free plan</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Later&apos;s free plan allows only 1 social set and 30 posts per month. SocialBeam gives you 10 accounts and unlimited posts &mdash; no monthly caps, ever.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Migration Guide */}
      <div className="max-w-4xl mx-auto mb-16">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">Migrate from Later in 3 steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-sm bg-brand text-background flex items-center justify-center font-semibold text-sm mb-3">1</div>
              <CardTitle className="text-foreground">Export your Later calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Use Later&apos;s calendar export or our importer to pull your scheduled posts, media assets, and account connections.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-sm bg-brand text-background flex items-center justify-center font-semibold text-sm mb-3">2</div>
              <CardTitle className="text-foreground">Connect your accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Link all your social accounts via OAuth. SocialBeam supports the same Instagram, Facebook, X, LinkedIn, TikTok, and Pinterest accounts Later does.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <div className="w-8 h-8 rounded-sm bg-brand text-background flex items-center justify-center font-semibold text-sm mb-3">3</div>
              <CardTitle className="text-foreground">Enable AI and publish</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Turn on AI-powered posting times and let SocialBeam optimize your schedule. Your posts continue publishing without any gap.
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
          Move beyond Instagram-only scheduling. Get 6 platforms, AI content creation, and unlimited posts — free forever.
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
