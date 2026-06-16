"use client";

import { useState, useEffect } from "react";
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
  X,
} from "@phosphor-icons/react";
import {
  typeLabelMap,
  typeIconMap,
  statusColorMap,
  statusLabelMap,
  relativeTime,
  formatDuration,
  truncateDetails,
  type ActivityLog,
} from "@/lib/activity-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ActivityLogWithProcess extends ActivityLog {
  progress?: number;
  currentStep?: string | null;
  postsFound?: number;
  postsProcessed?: number;
  processId?: string;
  processStatus?: string;
  hasLiveLogs?: boolean;
  canCancel?: boolean;
}

interface ActivityTableProps {
  logs: ActivityLogWithProcess[];
  onRowClick: (log: ActivityLogWithProcess) => void;
  onCancel?: (logId: string) => Promise<void>;
}

export function ActivityTable({ logs, onRowClick }: ActivityTableProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="size-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No activity logs</h3>
        <p className="text-sm text-muted-foreground">
          Activity logs will appear here as tasks run in your workspace.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Started
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Duration
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Details
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-background">
          {logs.map((log) => {
            const TypeIcon = typeIconMap[log.type] ?? Clock;
            const StatusIcon = log.status === "COMPLETED" ? CheckCircle : log.status === "FAILED" ? XCircle : Info;
            const statusColor = statusColorMap[log.status];

            return (
              <tr
                key={log.id}
                onClick={() => onRowClick(log)}
                className="cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className={`size-2 rounded-full ${statusColor} ${log.status === "RUNNING" ? "animate-pulse" : ""}`} />
                    <StatusIcon className={`size-4 ${log.status === "COMPLETED" ? "text-green-600" : log.status === "FAILED" ? "text-red-600" : "text-muted-foreground"}`} />
                    <span className="text-xs font-medium">{statusLabelMap[log.status]}</span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <TypeIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{typeLabelMap[log.type]}</span>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {relativeTime(log.startedAt, now)}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {log.status === "RUNNING" ? (
                      <span className="flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-blue-500 animate-pulse" />
                        In progress
                      </span>
                    ) : (
                      formatDuration(log.startedAt, log.finishedAt)
                    )}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground line-clamp-1">
                    {log.details ? truncateDetails(log.details, 80) : "—"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
