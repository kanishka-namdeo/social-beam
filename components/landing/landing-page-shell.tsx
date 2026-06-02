import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react/ssr";

interface LandingPageShellProps {
  hero: {
    title: string;
    description: string;
    ctaLabel?: string;
    ctaHref?: string;
  };
  children: React.ReactNode;
}

export function LandingPageShell({ hero, children }: LandingPageShellProps) {
  const ctaLabel = hero.ctaLabel ?? "Get Started Free";
  const ctaHref = hero.ctaHref ?? "/register";

  return (
    <>
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand/5 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-semibold text-foreground tracking-tight text-balance leading-tight">
              {hero.title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-balance">
              {hero.description}
            </p>
            <Link href={ctaHref}>
              <Button size="lg" className="gap-2 min-w-48 rounded-sm">
                {ctaLabel}
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {children}
        </div>
      </section>
    </>
  );
}
