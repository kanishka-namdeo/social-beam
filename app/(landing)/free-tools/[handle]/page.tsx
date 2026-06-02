import { LinkInBioViewer } from "@/components/tools/link-in-bio-viewer";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  return {
    title: `${decodeURIComponent(handle)} — Link in Bio | SocialBeam`,
    description: `View ${decodeURIComponent(handle)}'s link in bio page on SocialBeam.`,
  };
}

export default async function BioViewerPage({ params }: PageProps) {
  const { handle } = await params;
  return <LinkInBioViewer handle={handle} />;
}
