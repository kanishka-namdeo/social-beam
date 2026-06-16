import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Users, Clock, Sparkle } from "@phosphor-icons/react/ssr";

const stats = [
  {
    icon: CalendarCheck,
    value: "Unlimited posts",
    label: "No scheduling caps, ever",
  },
  {
    icon: Users,
    value: "7 platforms",
    label: "One dashboard, all your accounts",
  },
  {
    icon: Sparkle,
    value: "15+ hrs/week saved",
    label: "Content, replies, and insights on autopilot",
  },
  {
    icon: Clock,
    value: "Free forever",
    label: "10 accounts, no trial, no credit card",
  },
];

export function LandingSocialProof() {
  return (
    <section className="py-16 bg-muted/30 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.value} className="border-border rounded-sm hover-lift transition-shadow">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-brand/10 text-brand rounded-sm shrink-0" aria-hidden="true">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
