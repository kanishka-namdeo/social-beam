import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkle, Rocket, Building } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Pricing — Free Social Media Scheduler | SocialBeam",
  description:
    "Start free with unlimited posts across 10 accounts. Upgrade to AI features starting at $19/mo. No hidden fees, cancel anytime.",
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Everything you need to get started with social media scheduling.",
    icon: Sparkle,
    features: [
      "10 social accounts",
      "Unlimited posts",
      "Visual calendar",
      "Basic analytics",
      "Community support",
    ],
    cta: "Get Started Free",
    ctaHref: "/register",
    popular: false,
  },
  {
    name: "AI Starter",
    price: "$19",
    period: "/mo",
    description: "AI content creation and smart scheduling for individuals.",
    icon: Rocket,
    features: [
      "Everything in Free",
      "AI content generation",
      "Smart posting times",
      "Platform optimization",
      "Hashtag recommendations",
      "Priority support",
    ],
    cta: "Start AI Starter",
    ctaHref: "/register",
    popular: true,
  },
  {
    name: "AI Pro",
    price: "$49",
    period: "/mo",
    description: "Advanced AI and analytics for growing teams and businesses.",
    icon: Rocket,
    features: [
      "Everything in AI Starter",
      "25 social accounts",
      "Brand voice training",
      "Content performance AI",
      "Competitor analysis",
      "Team collaboration",
      "API access",
    ],
    cta: "Start AI Pro",
    ctaHref: "/register",
    popular: false,
  },
  {
    name: "AI Agency",
    price: "$149",
    period: "/mo",
    description: "Full-scale AI suite for agencies managing multiple brands.",
    icon: Building,
    features: [
      "Everything in AI Pro",
      "Unlimited accounts",
      "White-label reports",
      "Client management",
      "Bulk scheduling",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
    cta: "Start AI Agency",
    ctaHref: "/register",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Simple, transparent pricing",
        description:
          "Start free with unlimited posts across 10 accounts. Upgrade to AI features when you're ready. No hidden fees, cancel anytime.",
      }}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <Card
              key={tier.name}
              className={`border-border rounded-sm flex flex-col hover-lift transition-shadow ${
                tier.popular
                  ? "border-l-2 border-l-brand shadow-lg shadow-brand/5"
                  : ""
              }`}
            >
              {tier.popular && (
                <div className="bg-brand text-center text-sm font-medium text-background py-1">
                  Most Popular
                </div>
              )}
              <CardHeader className={tier.popular ? "pt-6" : ""}>
                <div className="p-3 bg-brand/10 text-brand w-fit mb-3 rounded-sm" aria-hidden="true">
                  <Icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl text-foreground tracking-tight">{tier.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-semibold text-foreground">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <CardDescription className="text-muted-foreground mt-2 leading-relaxed">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check weight="bold" className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href={tier.ctaHref} className="block mt-6">
                  <Button
                    className="w-full rounded-sm"
                    variant={tier.popular ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </LandingPageShell>
  );
}
