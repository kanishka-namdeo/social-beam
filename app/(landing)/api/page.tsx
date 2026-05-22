import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Key, ChartBar, CalendarCheck, Lock, ArrowRight } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Developer API — SocialBeam API Documentation",
  description:
    "Build custom integrations with the SocialBeam API. Schedule posts, manage accounts, and pull analytics programmatically.",
};

const apiFeatures = [
  {
    icon: Code,
    title: "RESTful API",
    description:
      "Clean, predictable endpoints with JSON request/response bodies. Full OpenAPI spec available for code generation.",
  },
  {
    icon: Key,
    title: "API Key Authentication",
    description:
      "Generate and rotate API keys from your dashboard. Scope keys to specific workspaces and permissions.",
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
  {
    icon: Lock,
    title: "Rate Limits",
    description:
      "Generous rate limits per tier. Free tier: 100 req/min. Pro: 1,000 req/min. Agency: unlimited.",
  },
  {
    icon: Code,
    title: "Webhooks",
    description:
      "Subscribe to post published, failed, and engagement events. Real-time notifications for async workflows.",
  },
];

const codeExample = `POST /api/v1/posts
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "content": "Excited to announce our new product! 🚀",
  "platforms": ["twitter", "linkedin"],
  "scheduled_at": "2026-05-23T10:00:00Z",
  "ai_optimize": true
}

// Response
{
  "id": "post_abc123",
  "status": "scheduled",
  "platforms": {
    "twitter": { "post_id": "tw_456", "status": "scheduled" },
    "linkedin": { "post_id": "li_789", "status": "scheduled" }
  }
}`;

export default function ApiPage() {
  return (
    <LandingPageShell
      hero={{
        title: "Developer API",
        description:
          "Build custom integrations with the SocialBeam API. Schedule posts, manage accounts, and pull analytics programmatically.",
      }}
    >
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {apiFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-brand/10 text-brand w-fit mb-3">
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

        <Card className="border-border bg-muted/20">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Quick Start</CardTitle>
            <CardDescription>Schedule your first post via API in under a minute.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-card border border-border rounded-lg p-4 overflow-x-auto text-sm text-foreground">
              <code>{codeExample}</code>
            </pre>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-muted-foreground">
            Full API documentation is coming soon. Join the waitlist to get early access.
          </p>
        </div>
      </div>
    </LandingPageShell>
  );
}
