import type { Metadata } from "next";
import { UTMGeneratorUI } from "@/components/tools/utm-generator-ui";

export const metadata: Metadata = {
  title: "Free UTM Generator — Campaign URL Builder | SocialBeam",
  description:
    "Build trackable campaign URLs with UTM parameters. Add source, medium, campaign, term, and content tags for analytics tracking — free, no signup required.",
};

export default function UTMGeneratorPage() {
  return <UTMGeneratorUI />;
}
