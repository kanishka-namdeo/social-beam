import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Code,
  Key,
  ChartBar,
  CalendarCheck,
  Lock,
  ArrowRight,
  PlugsConnected,
  ShieldCheck,
  Robot,
  EnvelopeSimple,
  ChatCircleText,
  PaintBrush,
  RedditLogo,
  Eye,
  Lightning,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "MCP Server & Developer API — AI Agent Integration | SocialBeam",
  description:
    "Connect Claude, Cursor, and other AI agents to SocialBeam via MCP (Model Context Protocol). OAuth 2.1 with PKCE, 7 tool categories, scope-based permissions.",
};

const mcpFeatures = [
  {
    icon: Key,
    title: "OAuth 2.1 + PKCE",
    description:
      "Enterprise-grade authentication with PKCE challenge flow. No API keys to leak — tokens are scoped, revocable, and time-limited.",
  },
  {
    icon: ShieldCheck,
    title: "Scope-Based Permissions",
    description:
      "7 tool scopes with granular permissions. Grant agents access to exactly what they need — from read-only analytics to full publish access.",
  },
  {
    icon: Lightning,
    title: "Streamable HTTP Transport",
    description:
      "Modern transport layer with streaming support for real-time agent interactions. Rate limiting and audit logging built in.",
  },
  {
    icon: Eye,
    title: "Audit Logging",
    description:
      "Every MCP operation is logged with full context. Track which agent did what, when, and with which scopes.",
  },
  {
    icon: Lock,
    title: "Rate Limiting",
    description:
      "Per-token rate limiting protects your account. Free tier: 100 req/min. Pro: 1,000 req/min. Agency: unlimited.",
  },
  {
    icon: PlugsConnected,
    title: "Health Checks",
    description:
      "Built-in health endpoint at /api/mcp/health. Monitor server status, tool availability, and connection metrics.",
  },
];

const toolScopes = [
  {
    icon: EnvelopeSimple,
    scope: "mcp:accounts",
    title: "Accounts",
    description: "View and manage connected social media platform accounts.",
  },
  {
    icon: ChatCircleText,
    scope: "mcp:compose",
    title: "Compose",
    description: "Create, edit, and manage social media posts programmatically.",
  },
  {
    icon: ChartBar,
    scope: "mcp:analytics",
    title: "Analytics",
    description: "Pull engagement metrics, audience growth, and performance data.",
  },
  {
    icon: PaintBrush,
    scope: "mcp:brand",
    title: "Brand",
    description: "Manage brand context, voice settings, and identity guidelines.",
  },
  {
    icon: EnvelopeSimple,
    scope: "mcp:inbox",
    title: "Inbox",
    description: "View and respond to comments, mentions, and DMs across platforms.",
  },
  {
    icon: CalendarCheck,
    scope: "mcp:publish",
    title: "Publish",
    description: "Schedule and publish posts to connected platforms via AI agents.",
  },
  {
    icon: RedditLogo,
    scope: "mcp:reddit",
    title: "Reddit",
    description: "Access trending topics, recommendations, and Reddit intelligence.",
  },
];

const compatibleAgents = [
  { name: "Claude Desktop", description: "Anthropic's desktop AI assistant" },
  { name: "Claude Code", description: "CLI-based AI coding agent" },
  { name: "Cursor", description: "AI-first code editor" },
  { name: "Hermes", description: "Open-source AI agent framework" },
  { name: "OpenClaw", description: "Autonomous AI agent platform" },
  { name: "Custom Agents", description: "Any MCP-compatible client" },
];

const mcpConfigExample = `// SocialBeam MCP Server Configuration
// Add to your Claude Desktop or Cursor config:

{
  "mcpServers": {
    "socialbeam": {
      "url": "https://app.socialbeam.ai/api/mcp",
      "transport": "streamable-http",
      "auth": {
        "type": "oauth2",
        "clientId": "YOUR_CLIENT_ID",
        "tokenUrl": "https://app.socialbeam.ai/api/auth/mcp-token",
        "scopes": [
          "mcp:compose",
          "mcp:analytics",
          "mcp:publish"
        ]
      }
    }
  }
}`;

const restApiFeatures = [
  {
    icon: Code,
    title: "RESTful API",
    description:
      "Clean, predictable endpoints with JSON request/response bodies. Full OpenAPI spec available for code generation.",
  },
  {
    icon: CalendarCheck,
    title: "Post Management",
    description:
      "Create, update, schedule, and delete posts programmatically. Support for multi-platform publishing in a single call.",
  },
  {
    icon: ChartBar,
    title: "Analytics Access",
    description:
      "Pull engagement data, follower growth, and performance metrics. Raw data and AI-generated insights available.",
  },
];

export default function ApiPage() {
  return (
    <LandingPageShell
      hero={{
        title: "The first social media MCP server",
        description:
          "Give Claude, Cursor, and any AI agent full control over your social workflow. OAuth 2.1 with PKCE, 7 scoped tool categories, complete audit trails.",
      }}
    >
      <div className="max-w-6xl mx-auto space-y-16">
        {/* MCP Features Grid */}
        <div>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <PlugsConnected className="w-6 h-6 text-brand" weight="fill" />
              <Badge variant="outline">MCP Server</Badge>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Production-grade MCP infrastructure
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SocialBeam is the first social media management platform with a full MCP server. Enterprise security, granular permissions, and complete audit trails.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {mcpFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border hover-lift transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="p-3 bg-brand/10 text-brand w-fit mb-3 rounded-sm" aria-hidden="true">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{feature.title}</CardTitle>
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

        {/* Tool Scopes */}
        <div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              7 tool scopes for complete agent control
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Each tool category has its own OAuth scope. Grant agents exactly the permissions they need — nothing more.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {toolScopes.map((tool) => {
              const Icon = tool.icon;
              return (
                <Card key={tool.scope} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-brand/10 text-brand rounded-sm" aria-hidden="true">
                        <Icon className="w-5 h-5" weight="bold" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-foreground">{tool.title}</CardTitle>
                        <code className="text-xs text-muted-foreground">{tool.scope}</code>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground text-sm">
                      {tool.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Configuration Example */}
        <div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Setup in under 2 minutes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Copy the configuration below into your Claude Desktop or Cursor config. Authenticate via OAuth, select your scopes, and you&apos;re live.
            </p>
          </div>

          <Card className="border-border bg-muted/20">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">MCP Server Configuration</CardTitle>
              <CardDescription>Add this to your AI agent&apos;s MCP configuration file.</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-card border border-border rounded-sm p-4 overflow-x-auto text-sm text-foreground font-mono">
                <code>{mcpConfigExample}</code>
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Compatible Agents */}
        <div>
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <Robot className="w-6 h-6 text-brand" weight="fill" />
              <Badge variant="outline">Compatible Agents</Badge>
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-3">
              Works with any MCP client
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              SocialBeam&apos;s MCP server is compatible with any client that implements the Model Context Protocol.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {compatibleAgents.map((agent) => (
              <Card key={agent.name} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground">{agent.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-sm">
                    {agent.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* REST API (Secondary) */}
        <div>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-foreground mb-3">
              REST API also available
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Prefer traditional REST? SocialBeam also offers a full REST API alongside MCP for developers who want it.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {restApiFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border hover-lift transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="p-3 bg-brand/10 text-brand w-fit mb-3 rounded-sm" aria-hidden="true">
                      <Icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{feature.title}</CardTitle>
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

        {/* CTA */}
        <div className="text-center space-y-4 py-8 border-t border-border">
          <h2 className="text-2xl font-bold text-foreground">
            Ready to connect your AI agents?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Start free. Connect Claude, Cursor, or any MCP client in under 2 minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2 min-w-48">
                Get Started Free
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/integrations">
              <Button size="lg" variant="outline" className="min-w-48">
                View All Integrations
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </LandingPageShell>
  );
}
