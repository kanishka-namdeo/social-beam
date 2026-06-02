import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkle, CalendarCheck, ChartBar, Clock } from "@phosphor-icons/react/ssr";

const features = [
  {
    icon: Sparkle,
    title: "AI Content Engine",
    description: "Describe what you want. AI writes platform-optimized captions, hashtags, and full campaigns.",
  },
  {
    icon: CalendarCheck,
    title: "Free Forever Scheduling",
    description: "10 accounts. Unlimited posts. Visual calendar. No credit card required.",
  },
  {
    icon: ChartBar,
    title: "Actionable Analytics",
    description: "Natural language insights, not raw data dumps. AI tells you what to do next.",
  },
  {
    icon: Clock,
    title: "Smart Scheduling",
    description: "AI predicts optimal posting times per platform — 25-40% engagement lift.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4 tracking-tight text-balance">
            Everything you need to grow your audience
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Powerful AI features that make social media management effortless.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border rounded-sm hover-lift transition-shadow">
                <CardHeader className="pb-3">
                  <div className="p-3 bg-brand/10 text-brand w-fit mb-3 rounded-sm" aria-hidden="true">
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-xl text-foreground tracking-tight">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
