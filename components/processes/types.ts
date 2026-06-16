import type { ActivityType } from "@/lib/activity-utils";

export type ScraperProcessType = ActivityType;

export type ScraperProcessStatus =
  | "QUEUED"
  | "STARTING"
  | "RUNNING"
  | "PAUSED"
  | "STOPPING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ORPHANED";

export interface ScraperProcess {
  id: string;
  workspaceId: string;
  type: ScraperProcessType;
  status: ScraperProcessStatus;
  progress: number;
  currentStep: string | null;
  postsFound: number;
  postsProcessed: number;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessLogEntry {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
}

export const ACTIVE_STATUSES: ScraperProcessStatus[] = [
  "QUEUED",
  "STARTING",
  "RUNNING",
  "PAUSED",
  "STOPPING",
];

export const CANCELABLE_STATUSES: ScraperProcessStatus[] = [
  "RUNNING",
  "STARTING",
];
