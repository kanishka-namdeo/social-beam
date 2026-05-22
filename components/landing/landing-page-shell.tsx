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
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
              {hero.title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              {hero.description}
            </p>
            <Link href={ctaHref}>
              <Button size="lg" className="gap-2 min-w-48">
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
