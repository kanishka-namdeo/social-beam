import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  XLogo,
  LinkedinLogo,
  GithubLogo,
} from "@phosphor-icons/react/ssr";

const footerLinks = {
  product: [
    { label: "Features", href: "/features" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "Pricing", href: "/pricing" },
    { label: "Use Cases", href: "/use-cases" },
    { label: "API", href: "/api" },
    { label: "Status", href: "/status" },
  ],
  platforms: [
    { label: "Instagram", href: "/platforms/instagram" },
    { label: "X (Twitter)", href: "/platforms/x" },
    { label: "LinkedIn", href: "/platforms/linkedin" },
    { label: "Facebook", href: "/platforms/facebook" },
    { label: "TikTok", href: "/platforms/tiktok" },
    { label: "Pinterest", href: "/platforms/pinterest" },
  ],
  alternatives: [
    { label: "Buffer", href: "/alternatives/buffer" },
    { label: "Hootsuite", href: "/alternatives/hootsuite" },
    { label: "Sprout Social", href: "/alternatives/sprout-social" },
    { label: "Later", href: "/alternatives/later" },
    { label: "Metricool", href: "/alternatives/metricool" },
  ],
  company: [
    { label: "Blog", href: "/blog" },
    { label: "Help Center", href: "/help" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ],
};

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-10 flex items-center"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooterCta() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Start managing social media smarter
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
          Join thousands of marketers, founders, and creators who save hours
          every week with AI-powered scheduling.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2">
            Get Started Free
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <footer className="container mx-auto px-4 mt-16 pt-8 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8">
          <FooterColumn
            title="Product"
            links={footerLinks.product}
          />
          <FooterColumn
            title="Platforms"
            links={footerLinks.platforms}
          />
          <FooterColumn
            title="Alternatives"
            links={footerLinks.alternatives}
          />
          <FooterColumn
            title="Company"
            links={footerLinks.company}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-foreground">
                SocialBeam
              </span>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                AI-native social media management
              </span>
            </div>
            <p className="text-sm text-muted-foreground sm:hidden">
              AI-native social media management
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="https://x.com/socialbeam"
              className="text-muted-foreground hover:text-foreground transition-colors min-h-10 min-w-10 flex items-center justify-center rounded-md hover:bg-accent"
              aria-label="X (Twitter)"
            >
              <XLogo className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="https://linkedin.com/company/socialbeam"
              className="text-muted-foreground hover:text-foreground transition-colors min-h-10 min-w-10 flex items-center justify-center rounded-md hover:bg-accent"
              aria-label="LinkedIn"
            >
              <LinkedinLogo className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="https://github.com/socialbeam"
              className="text-muted-foreground hover:text-foreground transition-colors min-h-10 min-w-10 flex items-center justify-center rounded-md hover:bg-accent"
              aria-label="GitHub"
            >
              <GithubLogo className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} SocialBeam. All rights reserved.
          </p>
        </div>
      </footer>
    </section>
  );
}
