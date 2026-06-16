"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface WidgetCardProps {
  children: React.ReactNode;
  className?: string;
}

export function WidgetCard({ children, className }: WidgetCardProps) {
  return <div className={cn("h-full", className)}>{children}</div>;
}
