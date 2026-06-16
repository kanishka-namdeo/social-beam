"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { WidgetLayout } from "@/lib/dashboard/widget-registry";
import type { UserRole } from "@/lib/role-guard";

const WidgetGrid = dynamic(
  () => import("@/components/dashboard/widget-grid-v2").then(mod => ({ default: mod.WidgetGrid })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    ),
  }
);

interface DashboardData {
  recentPosts: Array<{
    id: string;
    title: string | null;
    status: string;
    confidence: string | null;
    scheduledAt: string | null;
    publishedAt: string | null;
    platforms: Array<{ platform: string; status: string; error?: string | null }>;
  }>;
  scheduledPosts: Array<{
    id: string;
    title: string | null;
    platforms: string[];
    scheduledAt: string;
  }>;
  insights: {
    topPost?: {
      title: string;
      platform: string;
      engagementRate: number;
      likes: number;
      comments: number;
      shares: number;
    };
    trend?: {
      direction: "up" | "down";
      metric: string;
      value: string;
      period: string;
    };
    recommendation?: string;
  };
  quickStats: {
    totalPosts: number;
    scheduledCount: number;
    publishedThisWeek: number;
    failedCount: number;
  };
  connectedAccounts?: Array<{
    id: string;
    platform: string;
    platformUserId: string;
    status: string;
  }>;
}

interface WidgetGridDynamicProps {
  layout: WidgetLayout;
  data: DashboardData;
  userRole: UserRole;
}

export function WidgetGridDynamic(props: WidgetGridDynamicProps) {
  return <WidgetGrid {...props} />;
}
