import { auth } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/db/onboarding";
import { redirect } from "next/navigation";
import LandingPage from "@/components/landing";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    const userId = session.user.id ?? "";
    if (userId && (await isOnboardingComplete(userId))) {
      redirect("/dashboard");
    }
    redirect("/onboarding");
  }
  return <LandingPage />;
}
