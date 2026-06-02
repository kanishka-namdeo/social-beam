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
    { label: "Changelog", href: "/changelog" },
  ],
  platforms: [
    { label: "Instagram", href: "/platforms/instagram" },
    { label: "X (Twitter)", href: "/platforms/x" },
    { label: "LinkedIn", href: "/platforms/linkedin" },
    { label: "Facebook", href: "/platforms/facebook" },
    { label: "TikTok", href: "/platforms/tiktok" },
    { label: "Pinterest", href: "/platforms/pinterest" },
  ],
  solutions: [
    { label: "For Creators", href: "/use-cases" },
    { label: "For Small Business", href: "/use-cases" },
    { label: "For Agencies", href: "/use-cases" },
    { label: "For Nonprofits", href: "/use-cases" },
  ],
  resources: [
    { label: "Blog", href: "/blog" },
    { label: "Help Center", href: "/help" },
    { label: "Community", href: "/community" },
    { label: "Resources Hub", href: "/resources" },
    { label: "Free Tools", href: "/free-tools" },
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
  ],
  company: [
    { label: "Alternatives", href: "/alternatives" },
    { label: "Contact", href: "/contact" },
    { label: "Status", href: "/status" },
    { label: "Changelog", href: "/changelog" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/privacy" },
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
          <li key={`${link.href}-${link.label}`}>
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
    <section className="relative py-20 bg-gradient-to-b from-muted/30 to-muted/50 border-t border-border/50">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4 tracking-tight text-balance">
          Start managing social media smarter
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
          Join thousands of marketers, founders, and creators who save hours
          every week with AI-powered scheduling.
        </p>
        <Link href="/register">
          <Button size="lg" className="gap-2 rounded-sm">
            Get Started Free
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <footer className="container mx-auto px-4 mt-16 pt-8 border-t border-border">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 pb-8">
          <FooterColumn
            title="Product"
            links={footerLinks.product}
          />
          <FooterColumn
            title="Platforms"
            links={footerLinks.platforms}
          />
          <FooterColumn
            title="Solutions"
            links={footerLinks.solutions}
          />
          <FooterColumn
            title="Resources"
            links={footerLinks.resources}
          />
          <FooterColumn
            title="Company"
            links={footerLinks.company}
          />
          <FooterColumn
            title="Legal"
            links={footerLinks.legal}
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
              className="text-muted-foreground hover:text-foreground transition-colors min-h-10 min-w-10 flex items-center justify-center rounded-sm hover:bg-accent"
              aria-label="X (Twitter)"
            >
              <XLogo className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="https://linkedin.com/company/socialbeam"
              className="text-muted-foreground hover:text-foreground transition-colors min-h-10 min-w-10 flex items-center justify-center rounded-sm hover:bg-accent"
              aria-label="LinkedIn"
            >
              <LinkedinLogo className="size-5" aria-hidden="true" />
            </Link>
            <Link
              href="https://github.com/socialbeam"
              className="text-muted-foreground hover:text-foreground transition-colors min-h-10 min-w-10 flex items-center justify-center rounded-sm hover:bg-accent"
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
