import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "@phosphor-icons/react/ssr";

const tiers = [
  {
    name: "Free",
    price: "$0",
    description: "Everything you need to get started",
    features: [
      "Unlimited scheduled posts",
      "10 social accounts",
      "Visual calendar",
      "Basic analytics",
      "All core features",
    ],
    cta: "Get Started Free",
    href: "/register",
    variant: "outline" as const,
    popular: true,
  },
  {
    name: "AI Starter",
    price: "$19",
    period: "/mo",
    description: "AI-powered content creation",
    features: [
      "Everything in Free",
      "AI-powered content generation",
      "AI caption & hashtag generation",
      "Optimal posting time suggestions",
      "AI content analysis",
    ],
    cta: "Start AI Starter",
    href: "/register",
    variant: "default" as const,
    popular: false,
  },
  {
    name: "AI Pro",
    price: "$49",
    period: "/mo",
    description: "Full AI automation for teams",
    features: [
      "Everything in AI Starter",
      "Unlimited AI content generation",
      "AI campaign generation",
      "Automated engagement replies",
      "Priority support",
      "Team collaboration",
    ],
    cta: "Start AI Pro",
    href: "/register",
    variant: "outline" as const,
    popular: false,
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Free forever. AI when you&apos;re ready.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Schedule unlimited posts at no cost. Upgrade for AI-powered content creation.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <Card
              key={tier.name}
              className={`border-border flex flex-col hover-lift transition-shadow ${tier.popular ? "ring-2 ring-brand relative" : ""}`}
            >
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-xl text-foreground">{tier.name}</CardTitle>
                  {tier.popular && (
                    <Badge className="bg-brand text-primary-foreground">Most Popular</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted-foreground">{tier.period}</span>
                  )}
                </div>
                <CardDescription className="text-muted-foreground">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check weight="bold" className="w-4 h-4 text-brand mt-0.5 shrink-0" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={tier.href} className="w-full">
                  <Button variant={tier.variant} className="w-full">
                    {tier.cta}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
