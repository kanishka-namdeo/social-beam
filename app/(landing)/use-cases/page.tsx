import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BuildingOffice,
  Storefront,
  UserCircle,
  UsersThree,
  ArrowRight,
  Sparkle,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Use Cases — Social Media Solutions for Every Team | SocialBeam",
  description:
    "From agencies to solopreneurs, SocialBeam adapts to your workflow. AI-powered scheduling for every team size.",
};

const useCases = [
  {
    icon: BuildingOffice,
    title: "Agencies",
    description:
      "Manage multiple clients from one dashboard. White-label reports, client workspaces, and bulk scheduling save hours every week.",
    features: [
      "Client workspaces with isolated data",
      "White-label analytics reports",
      "Bulk scheduling across brands",
      "Role-based team permissions",
      "API for custom integrations",
    ],
    stats: "Save 15+ hours/week per client",
  },
  {
    icon: Storefront,
    title: "Small Businesses",
    description:
      "Maintain a consistent social presence without hiring a full-time marketer. AI writes your content and picks the best times to post.",
    features: [
      "AI-generated content from prompts",
      "Smart posting time predictions",
      "Local business templates",
      "Multi-location support",
      "Competitor benchmarking",
    ],
    stats: "3x more consistent posting",
  },
  {
    icon: UserCircle,
    title: "Freelancers & Creators",
    description:
      "Build your personal brand while focusing on your craft. Schedule content in batches and let AI handle the rest.",
    features: [
      "Free tier with 10 accounts",
      "Content batch creation",
      "Platform-specific optimization",
      "Engagement analytics",
      "Personal brand voice training",
    ],
    stats: "Free forever for individuals",
  },
  {
    icon: UsersThree,
    title: "Enterprise Teams",
    description:
      "Scale social operations across departments and regions. Advanced governance, compliance, and security for large organizations.",
    features: [
      "Unlimited accounts and users",
      "SSO and advanced security",
      "Approval workflows",
      "Custom compliance rules",
      "Dedicated account manager",
    ],
    stats: "SOC 2 compliant infrastructure",
  },
];

export default function UseCasesPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Built for every social media team",
        description:
          "Whether you're managing one brand or fifty, SocialBeam scales to your needs. AI-powered tools that adapt to your workflow.",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-8">
        {useCases.map((useCase) => {
          const Icon = useCase.icon;
          return (
            <Card key={useCase.title} className="border-border rounded-sm hover-lift transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-brand/10 text-brand rounded-sm">
                    <Icon className="w-8 h-8" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-foreground tracking-tight">{useCase.title}</CardTitle>
                    <CardDescription className="text-muted-foreground text-base mt-1 leading-relaxed">
                      {useCase.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3 tracking-tight">Key Features</h3>
                    <ul className="space-y-2">
                      {useCase.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                          <Sparkle weight="bold" className="w-4 h-4 text-brand mt-0.5 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col justify-center items-center bg-muted/30 rounded-sm p-6">
                    <p className="text-2xl font-semibold text-brand">{useCase.stats}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="text-center pt-8">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Get Started Free
              <ArrowRight weight="bold" className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </LandingPageShell>
  );
}
