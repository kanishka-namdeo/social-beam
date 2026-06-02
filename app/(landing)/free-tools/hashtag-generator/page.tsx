import type { Metadata } from "next";
import { HashtagGeneratorUI } from "@/components/tools/hashtag-generator-ui";

export const metadata: Metadata = {
  title: "Free Hashtag Generator — AI Hashtags for Instagram, TikTok, YouTube | SocialBeam",
  description:
    "Generate AI-powered hashtags for Instagram, TikTok, YouTube, X, and LinkedIn. Get categorized hashtags by niche, industry, trending, audience, and branded — free, no signup required.",
};

export default function HashtagGeneratorPage() {
  return <HashtagGeneratorUI />;
}
