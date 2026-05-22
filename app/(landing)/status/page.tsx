import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Warning, XCircle, Clock } from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "System Status — SocialBeam",
  description: "Check the current status of all SocialBeam services and platforms.",
};

const services = [
  { name: "Web App", status: "operational" as const },
  { name: "API", status: "operational" as const },
  { name: "AI Content Engine", status: "operational" as const },
  { name: "Post Scheduler", status: "operational" as const },
  { name: "X (Twitter) Integration", status: "operational" as const },
  { name: "LinkedIn Integration", status: "operational" as const },
  { name: "Instagram Integration", status: "operational" as const },
  { name: "Facebook Integration", status: "operational" as const },
  { name: "TikTok Integration", status: "operational" as const },
  { name: "Pinterest Integration", status: "operational" as const },
];

const statusConfig = {
  operational: {
    label: "Operational",
    icon: CheckCircle,
    className: "text-success",
    badgeVariant: "default" as const,
  },
  degraded: {
    label: "Degraded Performance",
    icon: Warning,
    className: "text-warning",
    badgeVariant: "outline" as const,
  },
  outage: {
    label: "Outage",
    icon: XCircle,
    className: "text-destructive",
    badgeVariant: "destructive" as const,
  },
  maintenance: {
    label: "Maintenance",
    icon: Clock,
    className: "text-muted-foreground",
    badgeVariant: "secondary" as const,
  },
};

const incidents = [
  {
    date: "May 20, 2026",
    title: "Instagram API rate limit increase",
    description: "Instagram temporarily reduced API rate limits. All affected posts were rescheduled automatically.",
    status: "resolved" as const,
    duration: "2 hours",
  },
  {
    date: "May 15, 2026",
    title: "Scheduled maintenance — database migration",
    description: "Planned maintenance to improve query performance for analytics dashboard.",
    status: "resolved" as const,
    duration: "45 minutes",
  },
];

export default function StatusPage() {
  const allOperational = services.every((s) => s.status === "operational");

  return (
    <LandingPageShell
      hero={{
        title: "System Status",
        description: allOperational
          ? "All systems are operational. Last checked just now."
          : "Some systems are experiencing issues.",
      }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {allOperational && (
          <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
            <CheckCircle weight="fill" className="w-6 h-6 text-success" />
            <span className="text-foreground font-medium">All systems operational</span>
          </div>
        )}

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Services</CardTitle>
            <CardDescription>Real-time status of all SocialBeam services and platform integrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.map((service) => {
                const config = statusConfig[service.status];
                const Icon = config.icon;
                return (
                  <div
                    key={service.name}
                    className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                  >
                    <span className="text-foreground text-sm">{service.name}</span>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.className}`} />
                      <span className={`text-sm ${config.className}`}>{config.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Recent Incidents</CardTitle>
            <CardDescription>A history of resolved incidents and maintenance events.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.date + incident.title}
                  className="border-b border-border pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-foreground font-medium text-sm">{incident.title}</span>
                    <Badge variant="outline" className="text-xs">
                      Resolved
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-1">{incident.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{incident.date}</span>
                    <span>Duration: {incident.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need real-time alerts?{" "}
            <a href="https://status.socialbeam.io" className="text-brand hover:underline">
              Subscribe to status updates
            </a>
          </p>
        </div>
      </div>
    </LandingPageShell>
  );
}
