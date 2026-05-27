import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Users, Clock } from "@phosphor-icons/react/ssr";

const stats = [
  {
    icon: CalendarCheck,
    value: "Unlimited posts",
    label: "Schedule without limits",
  },
  {
    icon: Users,
    value: "10+ platforms",
    label: "Connect all your accounts",
  },
  {
    icon: Clock,
    value: "15-20 hrs/week saved",
    label: "AI handles the busywork",
  },
];

export function LandingSocialProof() {
  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid sm:grid-cols-3 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.value} className="border-border hover-lift transition-shadow">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="p-3 bg-brand/10 text-brand rounded-md shrink-0" aria-hidden="true">
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
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
