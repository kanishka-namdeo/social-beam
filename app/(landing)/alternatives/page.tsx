import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Lightning, ChartBar, Robot, Calendar, Megaphone } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "SocialBeam vs Buffer, Hootsuite, Sprout Social | SocialBeam",
  description:
    "Compare SocialBeam with popular tools. See why teams are switching to our free social media platform.",
};

const competitors = [
  {
    slug: "buffer",
    name: "Buffer",
    tagline: "The Buffer alternative that's actually free",
    differentiator: "Buffer caps you at 3 channels for $6/mo. SocialBeam gives you 10 accounts + AI — free forever.",
    icon: Calendar,
    painPoints: ["Limited free plan", "No AI features", "Bare-bones analytics"],
  },
  {
    slug: "hootsuite",
    name: "Hootsuite",
    tagline: "Hootsuite features. Without the $249/mo price tag.",
    differentiator: "Hootsuite charges $249/mo for 10 accounts. SocialBeam does the same for free, plus AI content creation.",
    icon: Megaphone,
    painPoints: ["400% price increase since 2022", "Bloated UI", "High post failure rate"],
  },
  {
    slug: "sprout-social",
    name: "Sprout Social",
    tagline: "Sprout Social features. A fraction of the cost.",
    differentiator: "Sprout Social costs $249 per seat. SocialBeam gives your whole team access — free.",
    icon: ChartBar,
    painPoints: ["Per-seat pricing", "Enterprise-only focus", "Complex onboarding"],
  },
  {
    slug: "later",
    name: "Later",
    tagline: "Later for Instagram. SocialBeam for everything.",
    differentiator: "Later is great for Instagram but weak elsewhere. SocialBeam supports 6 platforms with AI — free.",
    icon: Lightning,
    painPoints: ["Weak on text platforms", "No AI content creation", "Limited free plan"],
  },
  {
    slug: "metricool",
    name: "Metricool",
    tagline: "Metricool's price. With AI-powered features.",
    differentiator: "Metricool is affordable but lacks AI. SocialBeam adds AI content creation and insights — still free.",
    icon: Robot,
    painPoints: ["No AI content creation", "Basic analytics", "Less polished UI"],
  },
];

export default function AlternativesPage() {
  return (
    <LandingPageShell
      hero={{
        title: "The last social media tool you'll need",
        description:
          "Compare SocialBeam with popular tools. See why teams are switching to our free social media platform.",
      }}
    >
      {/* Comparison Cards */}
      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">
          Compare SocialBeam with your current tool
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {competitors.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.slug} className="border-border flex flex-col hover:border-brand/50 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-brand/10 rounded-sm">
                      <Icon className="w-5 h-5 text-brand" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{c.name}</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground">
                    {c.tagline}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-foreground">{c.differentiator}</p>
                  <div className="space-y-2">
                    {c.painPoints.map((p) => (
                      <div key={p} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-sm bg-destructive shrink-0" />
                        {p}
                      </div>
                    ))}
                  </div>
                  <Link href={`/alternatives/${c.slug}`} className="block">
                    <Button variant="outline" className="w-full gap-2">
                      View comparison
                      <ArrowRight weight="bold" className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Why Teams Switch */}
      <div className="max-w-4xl mx-auto mt-20">
        <h2 className="text-2xl font-bold text-foreground text-center mb-8">
          Why teams are switching to SocialBeam
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-success/10 text-success">Free scheduling, forever</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Keep $249/mo. SocialBeam gives you 10 accounts with unlimited posts — free forever.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-brand/10 text-brand">AI that replaces busywork</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Content, hashtags, and smart scheduling built in — not bolted on. No other free tool offers this.
              </p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader>
              <Badge variant="secondary" className="w-fit bg-info/10 text-info">Move in minutes</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Import your existing schedule from any tool. No data loss, no downtime.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-2xl mx-auto mt-20 text-center space-y-6">
        <h2 className="text-3xl font-bold text-foreground">
          Start free — no credit card required
        </h2>
        <p className="text-lg text-muted-foreground">
          Get 10 social accounts, unlimited posts, and a visual calendar. Upgrade to AI features whenever you&apos;re ready.
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
