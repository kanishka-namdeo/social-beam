import type { Metadata } from "next";
import { NameGeneratorUI } from "@/components/tools/name-generator-ui";

export const metadata: Metadata = {
  title: "Free Instagram Name Generator — Creative Username Ideas | SocialBeam",
  description:
    "Generate creative, on-brand Instagram name ideas. Choose from professional, fun, creative, or minimal styles — free, no signup required.",
};

export default function NameGeneratorPage() {
  return <NameGeneratorUI />;
}
