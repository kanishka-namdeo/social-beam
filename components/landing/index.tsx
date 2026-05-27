import { LandingHero } from "@/components/landing/landing-hero";
import { LandingSocialProof } from "@/components/landing/landing-social-proof";
import { LandingFeatures } from "@/components/landing/landing-features";
import { LandingPricing } from "@/components/landing/landing-pricing";
import { LandingFaq } from "@/components/landing/landing-faq";

export default function LandingContent() {
  return (
    <>
      <LandingHero />
      <LandingSocialProof />
      <LandingFeatures />
      <LandingPricing />
      <LandingFaq />
    </>
  );
}
