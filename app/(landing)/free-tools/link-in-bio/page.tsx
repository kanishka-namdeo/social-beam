import type { Metadata } from "next";
import { LinkInBioBuilder } from "@/components/tools/link-in-bio-builder";

export const metadata: Metadata = {
  title: "Free Link in Bio — Customizable Bio Page | SocialBeam",
  description:
    "Create a free, customizable link-in-bio page for your social media profiles. Add links, choose themes, and share — no signup required.",
};

export default function LinkInBioPage() {
  return <LinkInBioBuilder />;
}
