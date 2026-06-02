import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LinkedinLogo,
  Briefcase,
  Sparkle,
  FileText,
  ChartLineUp,
  Users,
  Clock,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export function generateMetadata(): Metadata {
  return {
    title: "LinkedIn Scheduler — Schedule Company Page Posts | SocialBeam",
    description:
      "Schedule LinkedIn company page posts and articles. AI writes professional content. Free LinkedIn scheduling tool.",
  };
}

const features = [
  {
    icon: Briefcase,
    title: "Company Page Scheduling",
    description:
      "Schedule posts directly to your LinkedIn company page. Plan content weeks ahead and maintain a professional, consistent presence.",
  },
  {
    icon: Sparkle,
    title: "AI Professional Writing",
    description:
      "Generate polished, professional LinkedIn posts that match your company's tone. AI adapts to industry conventions and thought leadership style.",
  },
  {
    icon: FileText,
    title: "Document Posts",
    description:
      "Schedule PDF document posts that appear as carousels on LinkedIn. Perfect for whitepapers, case studies, and slide decks.",
  },
  {
    icon: ChartLineUp,
    title: "Performance Analytics",
    description:
      "Track post impressions, engagement rates, follower growth, and top-performing content. AI highlights what is working and what is not.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Assign roles, set approval workflows, and manage who can publish to your company page. Keep your brand voice consistent across team members.",
  },
  {
    icon: Clock,
    title: "Business Hours Optimization",
    description:
      "AI recommends posting times aligned with professional engagement patterns — typically weekday mornings and early afternoons for B2B audiences.",
  },
];

const bestPractices = [
  {
    title: "Post on weekdays, not weekends",
    description: "LinkedIn engagement peaks Tuesday through Thursday, 8-10 AM and 12-2 PM. Weekend posts typically see 50% less engagement.",
  },
  {
    title: "Lead with value, not promotion",
    description: "The best-performing LinkedIn posts educate, inform, or inspire. Share insights, data, and stories rather than direct product pitches.",
  },
  {
    title: "Use document carousels",
    description: "PDF documents posted as carousels get 3x more engagement than text-only posts. Turn reports and presentations into scrollable content.",
  },
  {
    title: "Engage with comments quickly",
    description: "Posts that get early comments from the company and followers are boosted by the algorithm. Respond to comments within the first 2 hours.",
  },
];

const faqs = [
  {
    question: "Can I schedule posts to LinkedIn company pages?",
    answer:
      "Yes. Connect your LinkedIn company page and schedule posts, articles, and document carousels in advance. SocialBeam supports both personal profiles and company pages.",
  },
  {
    question: "Does AI write professional content suitable for LinkedIn?",
    answer:
      "Absolutely. SocialBeam's AI is trained on high-performing professional content. It writes thought leadership posts, company updates, industry commentary, and announcements that match LinkedIn's professional tone.",
  },
  {
    question: "Can I schedule PDF documents as carousels?",
    answer:
      "Yes. Upload a PDF document and schedule it to publish as a LinkedIn carousel post. This is one of the highest-engagement post formats on LinkedIn.",
  },
  {
    question: "How many LinkedIn company pages can I manage?",
    answer:
      "Connect up to 10 social accounts on the free plan. This includes any mix of LinkedIn company pages, personal profiles, and accounts on other platforms.",
  },
];

export default function LinkedInLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Schedule LinkedIn posts and articles",
        description:
          "Plan company page content weeks ahead. AI writes professional posts, suggests optimal business-hour timing, and tracks engagement. Free for up to 10 accounts.",
        ctaLabel: "Start scheduling for free",
        ctaHref: "/register",
      }}
    >
      {/* Features */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <LinkedinLogo className="w-6 h-6 text-info" weight="fill" />
            <Badge variant="outline">LinkedIn Features</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Everything you need to grow your LinkedIn presence
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From company page scheduling to AI-powered professional writing, SocialBeam helps you maintain a consistent B2B presence.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-info/10 text-info w-fit mb-3">
                    <Icon className="w-6 h-6" weight="bold" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Best Practices */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            LinkedIn growth best practices
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Proven strategies to maximize your B2B reach and engagement on LinkedIn in 2026.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {bestPractices.map((practice) => (
            <div key={practice.title} className="flex gap-4 p-6 border border-border rounded-sm">
              <div className="w-10 h-10 rounded-sm bg-brand/10 text-brand flex items-center justify-center shrink-0 font-semibold">
                {bestPractices.indexOf(practice) + 1}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{practice.title}</h3>
                <p className="text-muted-foreground text-sm">{practice.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Common questions about scheduling LinkedIn posts with SocialBeam.
          </p>
        </div>

        <Accordion type="single" collapsible>
          {faqs.map((faq) => (
            <AccordionItem key={faq.question} value={faq.question}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* CTA */}
      <div className="text-center py-12 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-4">
          Ready to streamline your LinkedIn content strategy?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Join thousands of companies and professionals who save hours every week with AI-powered LinkedIn scheduling.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2 min-w-48">
            Start scheduling for free
          </Button>
        </Link>
      </div>
    </LandingPageShell>
  );
}
