import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, Quotes, TrendUp, Building } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Customers — Trusted by Teams Worldwide | SocialBeam",
  description:
    "See how agencies, brands, and creators use SocialBeam to save time, grow audiences, and streamline social media operations.",
};

const testimonials = [
  {
    quote: "SocialBeam replaced three tools for us. The AI content engine alone saves our team 10+ hours a week. The unified inbox means nothing falls through the cracks.",
    author: "Sarah Chen",
    role: "Head of Social, TechStart Inc.",
    company: "TechStart",
    industry: "Technology",
    result: "10+ hours/week saved",
  },
  {
    quote: "We manage social for 12 clients. SocialBeam's client workspaces and white-label reports let us look professional while actually saving money on our tool stack.",
    author: "Marcus Rivera",
    role: "Founder, Bright Social Agency",
    company: "Bright Social",
    industry: "Agency",
    result: "12 clients on one platform",
  },
  {
    quote: "The Reddit trend discovery is a game-changer. We find content ideas before our competitors even know they exist. Our engagement rate doubled in two months.",
    author: "Priya Patel",
    role: "Content Strategist, GrowthLab",
    company: "GrowthLab",
    industry: "Marketing",
    result: "2x engagement rate",
  },
  {
    quote: "As a solo creator, the free tier is incredible. 10 accounts, unlimited posts, and the AI helps me sound consistent across platforms. I upgraded to AI Pro for brand voice training.",
    author: "Jordan Lee",
    role: "Creator & Consultant",
    company: "Independent",
    industry: "Creator",
    result: "Free to paid in 30 days",
  },
  {
    quote: "We migrated from Hootsuite and cut our monthly spend by 60%. The AI analytics actually tell us what to do next, not just show us charts we don't understand.",
    author: "Aisha Mohammed",
    role: "Marketing Director, Nova Retail",
    company: "Nova Retail",
    industry: "Ecommerce",
    result: "60% cost reduction",
  },
  {
    quote: "Brand voice training was the selling point for us. We uploaded our style guide and the AI nails our tone now. Every caption reads like our team wrote it.",
    author: "David Thompson",
    role: "VP Marketing, Apex Fitness",
    company: "Apex Fitness",
    industry: "Fitness",
    result: "Consistent brand voice",
  },
];

const stats = [
  { value: "10,000+", label: "Active users" },
  { value: "50M+", label: "Posts scheduled" },
  { value: "99.9%", label: "Publishing uptime" },
  { value: "4.8/5", label: "Average rating" },
];

const logos = [
  "TechStart", "Bright Social", "GrowthLab", "Nova Retail", "Apex Fitness", "CloudSync",
  "Pulse Media", "Orbit Digital", "Summit Brands", "Velocity Co",
];

export default function CustomersLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Trusted by teams who take social seriously",
        description:
          "From solo creators to enterprise marketing teams, SocialBeam helps thousands of users save time and grow their audiences.",
      }}
    >
      {/* Stats */}
      <div className="mb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-6 border border-border rounded-sm">
              <p className="text-3xl font-bold text-brand">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Logos */}
      <div className="mb-16 text-center">
        <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wide">Trusted by teams at</p>
        <div className="flex flex-wrap justify-center gap-8 items-center max-w-4xl mx-auto">
          {logos.map((logo) => (
            <span key={logo} className="text-lg font-semibold text-muted-foreground/50">
              {logo}
            </span>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            What our customers say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real stories from teams using SocialBeam to transform their social media workflow.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((t) => (
            <Card key={t.author} className="border-border flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-warning" weight="fill" />
                  ))}
                </div>
                <div className="flex items-start gap-2">
                  <Quotes className="w-5 h-5 text-brand shrink-0 mt-1" weight="fill" />
                  <CardDescription className="text-muted-foreground text-base leading-relaxed">
                    {t.quote}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="mt-auto pt-4 border-t border-border">
                <p className="font-semibold text-foreground text-sm">{t.author}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
                <Badge variant="secondary" className="mt-2">{t.result}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-12 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Join thousands of teams already using SocialBeam
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Start free with 10 accounts and unlimited posts. Upgrade when you need AI.
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
