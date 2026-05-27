import { auth } from '@/lib/auth';
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://socialbeam.ai"),
  title: {
    default: "SocialBeam — Free AI-Powered Social Media Scheduler",
    template: "%s | SocialBeam",
  },
  description: "Schedule unlimited posts across 10 accounts for free. AI writes, optimizes, and analyzes your content. The Buffer alternative that's actually free.",
  keywords: ["social media scheduler", "free social media tool", "AI social media", "social media management", "Buffer alternative", "Hootsuite alternative", "schedule posts", "social media automation"],
  authors: [{ name: "SocialBeam" }],
  creator: "SocialBeam",
  publisher: "SocialBeam",
  formatDetection: {
    email: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://socialbeam.ai",
    siteName: "SocialBeam",
    title: "SocialBeam — Free AI-Powered Social Media Scheduler",
    description: "Schedule unlimited posts across 10 accounts for free. AI writes, optimizes, and analyzes your content.",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "SocialBeam — AI-native social media management platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SocialBeam — Free AI-Powered Social Media Scheduler",
    description: "Schedule unlimited posts across 10 accounts for free. AI writes, optimizes, and analyzes your content.",
    images: ["/og-image.svg"],
    creator: "@socialbeam",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  alternates: {
    canonical: "https://socialbeam.ai",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
