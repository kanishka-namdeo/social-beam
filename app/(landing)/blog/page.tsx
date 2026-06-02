import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  CalendarBlank,
  ArrowRight,
  Clock,
  Sparkle,
  InstagramLogo,
  ChartBar,
  Robot,
} from "@phosphor-icons/react/ssr";
import { LandingPageShell } from "@/components/landing/landing-page-shell";

export const metadata: Metadata = {
  title: "Blog — Social Media Tips & Updates | SocialBeam",
  description:
    "Read the latest social media tips, platform updates, and AI-powered content strategies from the SocialBeam team.",
};

const blogPosts = [
  {
    title: "How AI is Changing Social Media Scheduling",
    description:
      "Discover how artificial intelligence is transforming the way teams plan, create, and schedule social media content at scale.",
    category: "AI & Automation",
    readTime: "8 min read",
    date: "June 2026",
    icon: Robot,
    slug: "ai-changing-social-media-scheduling",
  },
  {
    title: "Best Times to Post on Instagram in 2026",
    description:
      "Data-driven insights on the optimal posting windows for maximum engagement on Instagram based on audience activity patterns.",
    category: "Platform Guide",
    readTime: "6 min read",
    date: "May 2026",
    icon: InstagramLogo,
    slug: "best-times-post-instagram-2026",
  },
  {
    title: "Buffer vs SocialBeam: Why Teams Are Switching",
    description:
      "An honest comparison of features, pricing, and AI capabilities. See why growing teams are making the move to SocialBeam.",
    category: "Comparison",
    readTime: "10 min read",
    date: "May 2026",
    icon: ChartBar,
    slug: "buffer-vs-socialbeam",
  },
  {
    title: "Complete Guide to Social Media Automation",
    description:
      "Everything you need to know about automating your social media workflow — from content calendars to AI-generated captions.",
    category: "Guide",
    readTime: "12 min read",
    date: "April 2026",
    icon: Sparkle,
    slug: "complete-guide-social-media-automation",
  },
];

export default function BlogPage() {
  return (
    <LandingPageShell
      hero={{
        title: "The SocialBeam Blog",
        description:
          "Social media tips, platform updates, and AI-powered content strategies to help you grow your audience.",
        ctaLabel: "Get Started Free",
        ctaHref: "/register",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Newsletter Signup */}
        <Card className="border-border bg-muted/30 rounded-sm">
          <CardHeader>
            <CardTitle className="text-2xl text-foreground tracking-tight">Subscribe to updates</CardTitle>
            <CardDescription className="text-muted-foreground leading-relaxed">
              Get the latest articles, tips, and product updates delivered to your inbox. No spam, ever.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
              <Input
                type="email"
                placeholder="you@example.com"
                className="flex-1 rounded-sm"
                aria-label="Email address for newsletter"
              />
              <Button className="gap-2 whitespace-nowrap rounded-sm">
                Subscribe
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Coming Soon Banner */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-sm px-3 py-1">
            Coming Soon
          </Badge>
          <p className="text-muted-foreground">
            Our blog is launching soon. Here is a preview of the topics we will cover.
          </p>
        </div>

        {/* Blog Post Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {blogPosts.map((post) => {
            const Icon = post.icon;
            return (
              <Card key={post.slug} className="border-border rounded-sm hover-lift transition-shadow hover:border-brand/50">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-5 h-5 text-brand" />
                    <Badge variant="secondary" className="text-xs rounded-sm">
                      {post.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-foreground leading-snug tracking-tight">{post.title}</CardTitle>
                  <CardDescription className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <CalendarBlank className="w-4 h-4" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {post.readTime}
                      </span>
                    </div>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-brand hover:underline inline-flex items-center gap-1"
                    >
                      Read more
                      <ArrowRight weight="bold" className="w-3 h-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA */}
        <Card className="border-border rounded-sm text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">Ready to supercharge your social media?</h2>
            <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
              Join thousands of creators and marketers using SocialBeam to schedule, analyze, and grow their audience.
            </p>
            <Link href="/register">
              <Button size="lg" className="gap-2 rounded-sm">
                Start for free
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </LandingPageShell>
  );
}
