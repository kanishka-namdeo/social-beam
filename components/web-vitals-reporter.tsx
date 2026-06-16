"use client";

import * as Sentry from "@sentry/nextjs";
import { useReportWebVitals } from "next/web-vitals";
import { useEffect, useRef } from "react";

export function WebVitalsReporter() {
  const sentRef = useRef<Set<string>>(new Set());

  useReportWebVitals((metric) => {
    const key = `${metric.name}-${metric.startTime}`;
    if (sentRef.current.has(key)) return;
    sentRef.current.add(key);

    if (process.env.NODE_ENV === "development") {
      console.log("[web-vitals]", metric.name, metric.value);
    }

    Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: "info",
      extra: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        url: typeof window !== "undefined" ? window.location.href : undefined,
      },
    });
  });

  useEffect(() => {
    sentRef.current.clear();
  }, []);

  return null;
}
