"use client";

import {
  typeIconMap,
  typeLabelMap,
  statusColorMap,
  statusLabelMap,
  relativeTime,
  formatDuration,
} from "@/lib/activity-utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "@phosphor-icons/react";
import type { ScraperProcess } from "./types";

interface ProcessTableProps {
  processes: ScraperProcess[];
  onRowClick: (process: ScraperProcess) => void;
}

export function ProcessTable({ processes, onRowClick }: ProcessTableProps) {
  if (processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-lg font-medium text-muted-foreground">
          No recent processes
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          Completed and failed processes will appear here
        </div>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Progress</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead className="w-[50px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {processes.map((process) => {
          const TypeIcon = typeIconMap[process.type];
          const statusColor = statusColorMap[process.status];
          const statusLabel = statusLabelMap[process.status];

          return (
            <TableRow
              key={process.id}
              className="cursor-pointer"
              onClick={() => onRowClick(process)}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  {TypeIcon && (
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {typeLabelMap[process.type]}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn("gap-1", statusColor)}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {statusLabel}
                </Badge>
              </TableCell>
              <TableCell>
                {process.progress > 0 ? (
                  <span className="tabular-nums">
                    {Math.round(process.progress)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {process.startedAt ? (
                  <span className="text-muted-foreground">
                    {relativeTime(process.startedAt)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {process.startedAt ? (
                  <span className="tabular-nums">
                    {formatDuration(process.startedAt, process.finishedAt)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowClick(process);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
