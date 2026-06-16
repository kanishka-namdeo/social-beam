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
  ShieldCheck,
  Lock,
  Eye,
  Database,
  Certificate,
  ArrowRight,
  Users,
  Key,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Security & Compliance — Enterprise-Grade Protection | SocialBeam",
  description:
    "SOC 2 compliant, encrypted OAuth connections, GDPR-ready, and role-based access control. Your social accounts and data stay protected.",
};

const pillars = [
  {
    icon: Certificate,
    title: "SOC 2 Compliant",
    description:
      "Our infrastructure meets SOC 2 Type II requirements for security, availability, and confidentiality. Independent audits verify our controls annually.",
  },
  {
    icon: Lock,
    title: "Encrypted Connections",
    description:
      "All social account connections use encrypted OAuth tokens. We never store your social media passwords. TLS 1.3 encrypts data in transit.",
  },
  {
    icon: Eye,
    title: "GDPR Ready",
    description:
      "Full GDPR compliance for data processing, storage, and deletion. Data processing agreements available for enterprise customers. Right to be forgotten supported.",
  },
  {
    icon: Database,
    title: "Data Residency",
    description:
      "Your data is stored in secure, geographically distributed data centers. Enterprise customers can request data residency in specific regions.",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    description:
      "Granular permissions ensure team members only see what they need. FREE_USER, PREMIUM_USER, and ADMIN roles with workspace-level controls.",
  },
  {
    icon: Key,
    title: "Token Revocation",
    description:
      "Revoke any connected account's access at any time from settings. Instant disconnection with no lingering permissions or data access.",
  },
];

const faqs = [
  {
    question: "Does SocialBeam store my social media passwords?",
    answer:
      "No. SocialBeam uses OAuth connections for all supported platforms. We never ask for or store your passwords. Access tokens are encrypted and can be revoked at any time.",
  },
  {
    question: "Is SocialBeam SOC 2 compliant?",
    answer:
      "Yes. SocialBeam maintains SOC 2 Type II compliance with annual third-party audits of our security, availability, and confidentiality controls.",
  },
  {
    question: "Can I delete all my data from SocialBeam?",
    answer:
      "Yes. You can delete your account at any time, which triggers complete deletion of your profile data, connected accounts, scheduled posts, and analytics data in accordance with GDPR.",
  },
  {
    question: "How does role-based access work?",
    answer:
      "SocialBeam supports FREE_USER, PREMIUM_USER, and ADMIN roles. Workspace admins can assign roles to control who can publish, approve, manage billing, or view analytics.",
  },
  {
    question: "What happens if a social account connection is compromised?",
    answer:
      "You can revoke any connected account instantly from settings. All tokens are individually encrypted and scoped. Revoking one connection does not affect others.",
  },
  {
    question: "Do you offer a Data Processing Agreement (DPA)?",
    answer:
      "Yes. DPAs are available for all customers and automatically provided for AI Agency plans. Contact our security team for custom DPA requirements.",
  },
];

export default function SecurityLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Enterprise-grade security for your social accounts",
        description:
          "SOC 2 compliant, encrypted OAuth, GDPR-ready, and role-based access. Your data and connected accounts stay protected at every level.",
        ctaLabel: "Learn more about our security",
        ctaHref: "/contact",
      }}
    >
      {/* Security Pillars */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <ShieldCheck className="w-6 h-6 text-brand" weight="fill" />
            <Badge variant="outline">Security & Compliance</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Built on a foundation of trust
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Security isn't an afterthought at SocialBeam. It's baked into every layer of our platform.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-brand/10 text-brand w-fit mb-3">
                    <Icon className="w-6 h-6" weight="bold" />
                  </div>
                  <CardTitle className="text-xl text-foreground">{pillar.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-base">
                    {pillar.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Common questions about SocialBeam's security and compliance.
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
          Need more details about our security?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Our security team is happy to answer questions, share audit reports, or discuss custom compliance requirements.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/contact">
            <Button size="lg" className="gap-2 min-w-48">
              Contact Security Team
              <ArrowRight weight="bold" className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="min-w-48">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>
    </LandingPageShell>
  );
}
