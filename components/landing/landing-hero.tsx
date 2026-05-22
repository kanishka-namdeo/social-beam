import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react/ssr";

export function LandingHero() {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight leading-tight">
              AI-native social media management — free forever
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl">
              Schedule unlimited posts across 10 accounts. AI writes, optimizes, and analyzes your content. Starts at $19/mo when you&apos;re ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2 min-w-48">
                  Get Started Free
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="min-w-48">
                  See how it works
                </Button>
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-brand-soft to-ai-surface border border-border p-6 md:p-8">
              <div className="bg-card border border-border p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-post-published" />
                  <div className="w-3 h-3 rounded-full bg-post-queued" />
                  <div className="w-3 h-3 rounded-full bg-post-draft" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                  <div className="h-4 w-5/6 bg-muted rounded" />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4">
                  <div className="h-20 bg-brand/10 border border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">X</span>
                  </div>
                  <div className="h-20 bg-brand/10 border border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">LinkedIn</span>
                  </div>
                  <div className="h-20 bg-brand/10 border border-border flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Instagram</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-3 w-full bg-brand-soft" />
                  <div className="h-3 w-4/5 bg-brand-soft" />
                  <div className="h-3 w-2/3 bg-brand-soft" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
