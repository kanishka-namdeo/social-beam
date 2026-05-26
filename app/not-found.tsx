import Link from "next/link";
import { House } from "@phosphor-icons/react/ssr";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="group/button inline-flex shrink-0 items-center justify-center rounded-none border border-transparent bg-primary bg-clip-padding px-6 text-xs font-semibold tracking-widest uppercase text-primary-foreground transition-all duration-150 select-none hover:bg-primary/80 active:scale-[0.98] h-10 gap-1.5"
          >
            <House className="mr-2 size-4" weight="bold" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
