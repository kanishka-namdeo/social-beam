"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StaggerPageProps {
  children: ReactNode;
  className?: string;
}

export const STAGGER_CLASSES = [
  "stagger-1",
  "stagger-2",
  "stagger-3",
  "stagger-4",
  "stagger-5",
  "stagger-6",
  "stagger-7",
  "stagger-8",
  "stagger-9",
  "stagger-10",
];

export function StaggerPage({ children, className }: StaggerPageProps) {
  if (!Array.isArray(children)) {
    return <div className={cn("space-y-6", className)}>{children}</div>;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {children.map((child, i) => (
        <div key={i} className={STAGGER_CLASSES[i % STAGGER_CLASSES.length]}>
          {child}
        </div>
      ))}
    </div>
  );
}
