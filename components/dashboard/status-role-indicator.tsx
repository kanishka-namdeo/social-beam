"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RoleBadge } from "./role-badge";
import type { UserRole } from "@/lib/role-guard";

interface StatusRoleIndicatorProps {
  role: UserRole;
  brandContext: {
    trainingStatus: string | null;
    lastTrainedAt: Date | null;
    businessName: string | null;
  } | null;
  aiStatus?: "idle" | "working" | "waiting-for-review";
  reviewCount?: number;
}

function getStatusInfo(brandContext: StatusRoleIndicatorProps["brandContext"]) {
  if (!brandContext) {
    return {
      color: "bg-muted",
      label: "No brand configured",
      detail: "Set up your brand context to get started",
    };
  }

  const { trainingStatus, lastTrainedAt, businessName } = brandContext;
  
  if (trainingStatus === "training") {
    return {
      color: "bg-warning animate-pulse",
      label: "Training in progress",
      detail: businessName ? `Training ${businessName}...` : "Your brand is being trained",
    };
  }

  if (trainingStatus === "failed") {
    return {
      color: "bg-destructive",
      label: "Training failed",
      detail: "Click to retry or check settings",
    };
  }

  if (!lastTrainedAt) {
    return {
      color: "bg-warning",
      label: "Not trained yet",
      detail: "Train your brand to enable AI features",
    };
  }

  const daysSince = (Date.now() - new Date(lastTrainedAt).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysSince > 30) {
    return {
      color: "bg-warning",
      label: "Training outdated",
      detail: `Last trained ${Math.floor(daysSince)} days ago. Consider retraining.`,
    };
  }

  return {
    color: "bg-success",
    label: "Brand ready",
    detail: lastTrainedAt 
      ? `Last trained ${Math.floor(daysSince)} days ago`
      : "Your brand is ready to use",
  };
}

function getAIStatusInfo(aiStatus: string, reviewCount: number) {
  if (aiStatus === "waiting-for-review") {
    return {
      color: "bg-warning animate-pulse",
      label: `${reviewCount} item${reviewCount !== 1 ? "s" : ""} need${reviewCount === 1 ? "s" : ""} review`,
    };
  }

  if (aiStatus === "working") {
    return {
      color: "bg-info animate-pulse",
      label: "AI is working",
    };
  }

  return {
    color: "bg-success",
    label: "AI ready",
  };
}

export function StatusRoleIndicator({
  role,
  brandContext,
  aiStatus = "idle",
  reviewCount = 0,
}: StatusRoleIndicatorProps) {
  const brandStatus = getStatusInfo(brandContext);
  const aiStatusInfo = getAIStatusInfo(aiStatus, reviewCount);

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-help">
            <div className={`w-2 h-2 rounded-full ${brandStatus.color}`} />
            <RoleBadge role={role} size="sm" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <div className="font-medium">{brandStatus.label}</div>
            <div className="text-xs text-muted-foreground">{brandStatus.detail}</div>
          </div>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors cursor-help">
            <div className={`w-2 h-2 rounded-full ${aiStatusInfo.color}`} />
            <span className="text-xs text-muted-foreground">AI</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs">{aiStatusInfo.label}</div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
