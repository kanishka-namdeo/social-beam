import { LandingNav } from "./landing-nav";
import { LandingHero } from "./landing-hero";
import { LandingSocialProof } from "./landing-social-proof";
import { LandingFeatures } from "./landing-features";
import { LandingPricing } from "./landing-pricing";
import { LandingFaq } from "./landing-faq";
import { LandingFooterCta } from "./landing-footer-cta";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingSocialProof />
        <LandingFeatures />
        <LandingPricing />
        <LandingFaq />
        <LandingFooterCta />
      </main>
    </div>
  );
}
