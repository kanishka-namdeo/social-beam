import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react/ssr";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight transition-colors hover:text-brand"
          >
            <Sparkle weight="fill" className="size-5 text-brand" aria-hidden="true" />
            SocialBeam
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-3xl px-6 text-center text-sm text-muted-foreground">
          <p>
            Powered by{" "}
            <Link href="/" className="font-medium text-foreground hover:text-brand transition-colors">
              SocialBeam
            </Link>
            {" "}&mdash; Free AI-Powered Social Media Scheduler
          </p>
        </div>
      </footer>
    </div>
  );
}
