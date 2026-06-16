import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooterCta } from "@/components/landing/landing-footer-cta";
import { CookieConsent } from "@/components/cookie-consent";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>{children}</main>
      <LandingFooterCta />
      <CookieConsent />
    </div>
  );
}
