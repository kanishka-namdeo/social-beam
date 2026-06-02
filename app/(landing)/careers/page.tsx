import type { Metadata } from "next";
import { LandingPageShell } from "@/components/landing/landing-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Star, ChartLineUp, Rocket } from "@phosphor-icons/react/ssr";

export const metadata: Metadata = {
  title: "Careers — Join the SocialBeam Team",
  description:
    "Help build the future of AI-powered social media management. We're a remote-first team building tools used by thousands of marketers worldwide.",
  alternates: {
    canonical: "https://socialbeam.ai/careers",
  },
  openGraph: {
    title: "Careers — Join the SocialBeam Team",
    description:
      "Help build the future of AI-powered social media management. We're a remote-first team building tools used by thousands of marketers worldwide.",
    url: "https://socialbeam.ai/careers",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Careers at SocialBeam — Join our team",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Careers — Join the SocialBeam Team",
    description:
      "Help build the future of AI-powered social media management. We're a remote-first team building tools used by thousands of marketers worldwide.",
    images: ["/og-image.svg"],
  },
};

const openRoles = [
  {
    title: "Senior Frontend Engineer",
    location: "Remote",
    type: "Full-time",
    description:
      "Lead the development of our Next.js + React frontend. Build beautiful, accessible interfaces used by thousands of marketers daily.",
    tags: ["Next.js", "TypeScript", "React", "Tailwind CSS"],
  },
  {
    title: "AI/ML Engineer",
    location: "Remote",
    type: "Full-time",
    description:
      "Build and optimize our AI content generation engine. Work with LLMs, prompt engineering, and brand voice training systems.",
    tags: ["Python", "LLMs", "LangGraph", "Prompt Engineering"],
  },
  {
    title: "Product Designer",
    location: "Remote",
    type: "Full-time",
    description:
      "Design intuitive workflows for social media scheduling and analytics. Shape the product experience for creators and teams.",
    tags: ["Figma", "UI/UX", "Design Systems", "Research"],
  },
];

const perks = [
  { icon: Star, title: "Remote-First", description: "Work from anywhere. We're a distributed team across multiple time zones." },
  { icon: ChartLineUp, title: "Growth", description: "Learning budget, conference attendance, and mentorship from industry leaders." },
  { icon: Rocket, title: "Impact", description: "Your work directly impacts thousands of users. Ship fast and see results immediately." },
];

export default function CareersPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Build the future of social media management",
        description:
          "Join a remote-first team that's reshaping how creators and businesses manage their social presence — powered by AI.",
        ctaLabel: "View Open Roles",
        ctaHref: "#open-roles",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Why Join */}
        <div className="text-center space-y-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
            Why SocialBeam?
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {perks.map((perk) => {
              const Icon = perk.icon;
              return (
                <div key={perk.title} className="text-center space-y-3">
                  <div className="inline-flex p-3 bg-brand/10 text-brand rounded-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{perk.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{perk.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Open Roles */}
        <div id="open-roles">
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight text-center mb-8">
            Open Positions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {openRoles.map((role) => (
              <Card key={role.title} className="border-border rounded-sm hover-lift transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl text-foreground tracking-tight">{role.title}</CardTitle>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="secondary" className="rounded-sm">{role.location}</Badge>
                        <span className="text-sm text-muted-foreground">{role.type}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">{role.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {role.tags.map((tag) => (
                      <span key={tag} className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Button variant="ghost" className="gap-2 text-brand hover:text-brand" asChild>
                    <Link href="/contact">
                      Apply Now <ArrowRight weight="bold" className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Culture */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Don&apos;t see the right role?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            We&apos;re always looking for talented people. Send us your resume and we&apos;ll keep you in mind for future openings.
          </p>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/contact">
              Get in Touch <ArrowRight weight="bold" className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </LandingPageShell>
  );
}
