import type { Icon } from "@phosphor-icons/react";
import {
  Brain,
  ChartBar,
  CheckCircle,
  Clock,
  Info,
  LinkedinLogo,
  PaperPlaneTilt,
  RedditLogo,
  Sparkle,
  Wrench,
  XCircle,
} from "@phosphor-icons/react/ssr";

export type ActivityType =
  | "REDDIT_SCRAPING"
  | "BRAND_LEARNING"
  | "SCRAPER_HEALER"
  | "PUBLISH_QUEUE"
  | "ANALYTICS_SYNC"
  | "BRAND_ANALYSIS"
  | "LINKEDIN_IMPORT";

export type ActivityStatus =
  | "QUEUED"
  | "STARTING"
  | "RUNNING"
  | "PAUSED"
  | "STOPPING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ORPHANED";

export interface ActivityLog {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  details?: Record<string, unknown> | null;
  startedAt: string;
  finishedAt?: string | null;
  createdAt: string;
}

export const typeIconMap: Record<ActivityType, Icon> = {
  REDDIT_SCRAPING: RedditLogo,
  BRAND_LEARNING: Sparkle,
  SCRAPER_HEALER: Wrench,
  PUBLISH_QUEUE: PaperPlaneTilt,
  ANALYTICS_SYNC: ChartBar,
  BRAND_ANALYSIS: Brain,
  LINKEDIN_IMPORT: LinkedinLogo,
};

export const typeLabelMap: Record<ActivityType, string> = {
  REDDIT_SCRAPING: "Reddit Scraping",
  BRAND_LEARNING: "Brand Learning",
  SCRAPER_HEALER: "Scraper Health Check",
  PUBLISH_QUEUE: "Post Publishing",
  ANALYTICS_SYNC: "Analytics Sync",
  BRAND_ANALYSIS: "Brand Analysis",
  LINKEDIN_IMPORT: "LinkedIn Import",
};

export const statusColorMap: Record<ActivityStatus, string> = {
  QUEUED: "bg-gray-400",
  STARTING: "bg-blue-400",
  RUNNING: "bg-blue-500",
  PAUSED: "bg-yellow-500",
  STOPPING: "bg-orange-500",
  COMPLETED: "bg-green-500",
  FAILED: "bg-red-500",
  CANCELLED: "bg-gray-500",
  ORPHANED: "bg-red-400",
};

export const statusLabelMap: Record<ActivityStatus, string> = {
  QUEUED: "Queued",
  STARTING: "Starting",
  RUNNING: "Running",
  PAUSED: "Paused",
  STOPPING: "Stopping",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  ORPHANED: "Orphaned",
};

export function getStatusIcon(status: ActivityStatus) {
  switch (status) {
    case "COMPLETED":
      return CheckCircle;
    case "FAILED":
      return XCircle;
    default:
      return Info;
  }
}

export function getStatusColor(status: ActivityStatus): string {
  switch (status) {
    case "COMPLETED":
      return "text-green-600 dark:text-green-400";
    case "FAILED":
    case "ORPHANED":
      return "text-red-600 dark:text-red-400";
    case "RUNNING":
    case "STARTING":
      return "text-blue-600 dark:text-blue-400";
    case "PAUSED":
      return "text-yellow-600 dark:text-yellow-400";
    case "STOPPING":
      return "text-orange-600 dark:text-orange-400";
    case "QUEUED":
    case "CANCELLED":
      return "text-gray-600 dark:text-gray-400";
    default:
      return "text-muted-foreground";
  }
}

export function relativeTime(date: Date | string, now?: number): string {
  const timestamp = typeof date === "string" ? new Date(date).getTime() : date.getTime();
  const currentTime = now ?? Date.now();
  const seconds = Math.floor((currentTime - timestamp) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

export function formatDuration(startedAt: string | Date, finishedAt?: string | Date | null): string {
  const start = typeof startedAt === "string" ? new Date(startedAt).getTime() : startedAt.getTime();
  const end = finishedAt 
    ? (typeof finishedAt === "string" ? new Date(finishedAt).getTime() : finishedAt.getTime())
    : Date.now();
  
  const durationMs = end - start;
  const seconds = Math.floor(durationMs / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function truncateDetails(details: unknown, maxLength: number = 100): string {
  if (!details) return "";
  
  const str = typeof details === "string" ? details : JSON.stringify(details, null, 2);
  
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "...";
}
