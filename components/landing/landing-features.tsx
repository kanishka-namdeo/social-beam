import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkle, CalendarCheck, ChartBar, EnvelopeSimple, RedditLogo, Image, Palette, Wrench, PlugsConnected, Megaphone, Robot } from "@phosphor-icons/react/ssr";

const features = [
  {
    icon: Sparkle,
    title: "Content That Writes Itself",
    description: "Describe the post you want. Get platform-optimized captions, hashtags, and campaigns in your brand voice — ready to publish.",
  },
  {
    icon: EnvelopeSimple,
    title: "Never Miss a Conversation",
    description: "Every comment, mention, and DM in one place. AI drafts replies so you respond faster and stay engaged.",
  },
  {
    icon: CalendarCheck,
    title: "Schedule Without Limits",
    description: "10 accounts. Unlimited posts. Drag-and-drop calendar. Free forever — not a trial, not a teaser.",
  },
  {
    icon: RedditLogo,
    title: "Catch Trends Before They Peak",
    description: "Discover trending topics matched to your brand. Turn what's hot into ready-to-publish posts in one click.",
  },
  {
    icon: ChartBar,
    title: "Insights That Tell You What to Do",
    description: "Skip the dashboards. Get plain-English recommendations on what to post next, when, and why.",
  },
  {
    icon: Palette,
    title: "Your Voice, Every Platform",
    description: "Upload your style guide. The system learns your tone and keeps it consistent from LinkedIn thought leadership to Instagram captions.",
  },
  {
    icon: PlugsConnected,
    title: "Let Your AI Agents Run It",
    description: "Connect Claude, Cursor, and any AI agent to manage your social presence autonomously. Enterprise-grade security with scoped permissions.",
  },
  {
    icon: Megaphone,
    title: "Launch Campaigns in 4 Steps",
    description: "Describe your campaign. AI generates phased content, adapts to audience response, and recycles what works.",
  },
  {
    icon: Robot,
    title: "An Agent That Knows Your Brand",
    description: "A dedicated AI agent that studies your content, researches your market, and handles your social strategy end-to-end.",
  },
  {
    icon: Image,
    title: "All Your Assets, One Place",
    description: "Upload, tag, and organize every image and video. Drag them straight into scheduled posts.",
  },
  {
    icon: Wrench,
    title: "Free Tools, No Signup",
    description: "Hashtag generator, post creator, UTM builder, link-in-bio — all free, all usable without creating an account.",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 border-t border-border/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4 tracking-tight text-balance">
            Your social media workflow, rethought
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Content creation, smart scheduling, engagement tracking, and analytics — all working together by default.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border rounded-sm transition-shadow">
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
