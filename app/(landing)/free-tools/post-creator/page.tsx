import type { Metadata } from "next";
import { PostCreatorUI } from "@/components/tools/post-creator-ui";

export const metadata: Metadata = {
  title: "Free Social Media Post Creator — AI Content Generator | SocialBeam",
  description:
    "Generate AI-powered social media posts for Instagram, TikTok, YouTube, X, and LinkedIn. Choose your tone and get ready-to-publish content — free, no signup required.",
};

export default function PostCreatorPage() {
  return <PostCreatorUI />;
}
