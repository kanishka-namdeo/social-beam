"use client";

import { ArrowLeft } from "@phosphor-icons/react/ssr";
import Link from "next/link";

export function PageHeader({
  title,
  description,
  backLink,
  children,
}: {
  title: string;
  description?: string;
  backLink?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      {backLink && (
        <Link
          href={backLink.href}
          className="group -ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          {backLink.label}
        </Link>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}
