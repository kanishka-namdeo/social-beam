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
  Plug,
  SlackLogo,
  NotionLogo,
  CloudArrowUp,
  Palette,
  Drop,
  ArrowRight,
  Code,
  PuzzlePiece,
  PlugsConnected,
  Key,
  ShieldCheck,
  ChatCircleText,
  ChartBar,
  CalendarCheck,
  PaintBrush,
  EnvelopeSimple,
  RedditLogo,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Integrations & MCP — Connect AI Agents and Tools | SocialBeam",
  description:
    "Connect Claude, Cursor, and other AI agents via MCP (Model Context Protocol). Plus integrations with Slack, Notion, Google Drive, Canva, and more.",
};

const mcpToolCategories = [
  {
    icon: EnvelopeSimple,
    name: "Accounts",
    description: "View and manage connected social media platform accounts.",
  },
  {
    icon: ChatCircleText,
    name: "Compose",
    description: "Create, edit, and manage social media posts programmatically.",
  },
  {
    icon: ChartBar,
    name: "Analytics",
    description: "Pull engagement metrics, audience growth, and performance data.",
  },
  {
    icon: PaintBrush,
    name: "Brand",
    description: "Manage brand context, voice settings, and identity guidelines.",
  },
  {
    icon: EnvelopeSimple,
    name: "Inbox",
    description: "View and respond to comments, mentions, and DMs across platforms.",
  },
  {
    icon: CalendarCheck,
    name: "Publish",
    description: "Schedule and publish posts to connected platforms via AI agents.",
  },
  {
    icon: RedditLogo,
    name: "Reddit",
    description: "Access trending topics, recommendations, and Reddit intelligence.",
  },
];

const compatibleAgents = ["Claude", "Cursor", "Hermes", "OpenClaw", "Any MCP-compatible client"];

const integrations = [
  {
    icon: SlackLogo,
    name: "Slack",
    description: "Get notified when posts publish, fail, or need approval. Share content for team review directly in Slack channels.",
    category: "Communication",
  },
  {
    icon: NotionLogo,
    name: "Notion",
    description: "Import content calendars, briefs, and style guides from Notion. Sync your editorial planning workflow.",
    category: "Productivity",
  },
  {
    icon: CloudArrowUp,
    name: "Google Drive",
    description: "Access images, videos, and brand assets directly from Google Drive. Drag files into your posts without downloading.",
    category: "Storage",
  },
  {
    icon: Palette,
    name: "Canva",
    description: "Design graphics in Canva and send them straight to your SocialBeam media library. Seamless creative workflow.",
    category: "Design",
  },
  {
    icon: Drop,
    name: "Dropbox",
    description: "Connect your Dropbox to access shared brand assets, campaign materials, and approved content for scheduling.",
    category: "Storage",
  },
  {
    icon: PuzzlePiece,
    name: "Zapier",
    description: "Connect SocialBeam to 5,000+ apps via Zapier. Automate workflows, trigger posts from form submissions, and more.",
    category: "Automation",
  },
];

const apiFeatures = [
  {
    icon: Code,
    title: "REST API",
    description: "Full REST API for programmatic post creation, scheduling, analytics retrieval, and account management.",
  },
  {
    icon: Plug,
    title: "Webhooks",
    description: "Real-time webhooks for post publishing events, engagement updates, and error notifications.",
  },
  {
    icon: ArrowRight,
    title: "Custom Integrations",
    description: "AI Agency customers get dedicated support for building custom integrations tailored to your workflow.",
  },
];

const faqs = [
  {
    question: "What is MCP and how does it work?",
    answer:
      "MCP (Model Context Protocol) is a standardized protocol that lets AI agents like Claude, Cursor, and others connect directly to SocialBeam. Through OAuth 2.1 with PKCE authentication, agents can schedule posts, pull analytics, manage brand context, and respond to engagement — all through a secure, standardized interface with scope-based permissions.",
  },
  {
    question: "Which AI agents are compatible with SocialBeam's MCP server?",
    answer:
      "SocialBeam's MCP server is compatible with any MCP client, including Claude Desktop, Claude Code, Cursor, Hermes, OpenClaw, and custom agents built with the Model Context Protocol SDK. Setup takes under 2 minutes with copy-paste configuration.",
  },
  {
    question: "Which integrations are available on the free plan?",
    answer:
      "All core integrations (Google Drive, Dropbox, Canva) are available on the free plan. Slack notifications and Zapier connections require an AI Starter plan or higher. MCP access is available on all plans with scope-based permissions.",
  },
  {
    question: "Can I build custom integrations with the API?",
    answer:
      "Yes. SocialBeam offers a full REST API available on AI Pro and AI Agency plans. API documentation is available in your dashboard under Settings > Developer.",
  },
  {
    question: "Do you support two-way sync with content tools?",
    answer:
      "Currently, integrations are one-way (import into SocialBeam). Two-way sync with Notion and other tools is on our roadmap.",
  },
  {
    question: "How do I connect Zapier to SocialBeam?",
    answer:
      "Search for SocialBeam in Zapier's app directory, authenticate with your SocialBeam account, and choose from pre-built Zaps or create custom workflows.",
  },
];

export default function IntegrationsLandingPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Connect AI agents and your favorite tools",
        description:
          "Let Claude, Cursor, and other AI agents operate SocialBeam via MCP. Plus integrations with Slack, Notion, Google Drive, Canva, and more.",
        ctaLabel: "Get started free",
        ctaHref: "/register",
      }}
    >
      {/* MCP Section - Primary Integration */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <PlugsConnected className="w-6 h-6 text-brand" weight="fill" />
            <Badge variant="outline">Model Context Protocol</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Connect AI agents via MCP
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            SocialBeam is the first social media management platform with a production-grade MCP server. Let external AI agents schedule posts, pull analytics, and manage your brand — all through a secure, standardized protocol.
          </p>
        </div>

        {/* MCP Security Features */}
        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="p-3 bg-brand/10 text-brand w-fit mb-3">
                <Key className="w-6 h-6" weight="bold" />
              </div>
              <CardTitle className="text-lg text-foreground">OAuth 2.1 + PKCE</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground text-sm">
                Enterprise-grade authentication with PKCE challenge flow. No API keys to leak — tokens are scoped, revocable, and time-limited.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="p-3 bg-brand/10 text-brand w-fit mb-3">
                <ShieldCheck className="w-6 h-6" weight="bold" />
              </div>
              <CardTitle className="text-lg text-foreground">Scope-Based Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground text-sm">
                Grant agents access to exactly what they need. 7 tool scopes with granular permissions — from read-only analytics to full publish access.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="p-3 bg-brand/10 text-brand w-fit mb-3">
                <Code className="w-6 h-6" weight="bold" />
              </div>
              <CardTitle className="text-lg text-foreground">Streamable HTTP</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-muted-foreground text-sm">
                Modern transport layer with streaming support. Rate limiting, audit logging, and health checks built in.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* MCP Tool Categories */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-foreground text-center mb-6">
            7 tool categories for complete agent control
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {mcpToolCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card key={category.name} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-brand" weight="bold" />
                      <CardTitle className="text-base text-foreground">{category.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground text-sm">
                      {category.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Compatible Agents */}
        <div className="text-center mb-10">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Compatible with any MCP client
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {compatibleAgents.map((agent) => (
              <Badge key={agent} variant="secondary" className="px-4 py-2 text-sm">
                {agent}
              </Badge>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link href="/api">
            <Button variant="outline" className="gap-2">
              View MCP Documentation
              <ArrowRight weight="bold" className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Traditional Integrations Grid */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <Plug className="w-6 h-6 text-brand" weight="fill" />
            <Badge variant="outline">Integrations</Badge>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Works with the tools you already use
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            No need to change your workflow. SocialBeam connects to your favorite apps.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {integrations.map((integration) => {
            const Icon = integration.icon;
            return (
              <Card key={integration.name} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-brand/10 text-brand">
                      <Icon className="w-6 h-6" weight="bold" />
                    </div>
                    <Badge variant="outline" className="text-xs">{integration.category}</Badge>
                  </div>
                  <CardTitle className="text-xl text-foreground">{integration.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-base">
                    {integration.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* API */}
      <div className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Build custom integrations with our API
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Full REST API and webhooks for developers. AI Agency customers get dedicated integration support.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {apiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-brand/10 text-brand w-fit mb-3">
                    <Icon className="w-6 h-6" weight="bold" />
                  </div>
                  <CardTitle className="text-lg text-foreground">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-sm">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <Link href="/api">
            <Button variant="outline" className="gap-2">
              View API Documentation
              <ArrowRight weight="bold" className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* FAQ */}
      <div className="mb-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground">
            Common questions about SocialBeam integrations and MCP.
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
          Ready to connect your entire workflow?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Start free and integrate with AI agents and your favorite tools as you grow.
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
