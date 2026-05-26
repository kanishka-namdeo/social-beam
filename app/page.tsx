import { auth } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooterCta } from "@/components/landing/landing-footer-cta";
import LandingContent from "@/components/landing";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    const userId = session.user.id ?? "";
    if (userId && (await isOnboardingComplete(userId))) {
      redirect("/dashboard");
    }
    redirect("/onboarding");
  }
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <LandingContent />
      </main>
      <LandingFooterCta />
    </div>
  );
}
