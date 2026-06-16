"use client";

import { useRef, useState } from "react";
import { Megaphone, RocketLaunch, Users, ChatCircle } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";

interface PhaseTimelineProps {
  phases: Array<{
    id: string;
    name: string;
    phase: string;
    order: number;
    posts: { id: string }[];
  }>;
  activePhaseId?: string;
  onPhaseClick?: (phaseId: string) => void;
}

const PHASE_COLORS: Record<string, string> = {
  TEASER: "text-blue-500",
  LAUNCH: "text-brand",
  SOCIAL_PROOF: "text-green-500",
  LAST_CALL: "text-orange-500",
};

const PHASE_ICONS: Record<string, typeof Megaphone> = {
  TEASER: Megaphone,
  LAUNCH: RocketLaunch,
  SOCIAL_PROOF: Users,
  LAST_CALL: ChatCircle,
};

function getPhaseColor(phaseType: string): string {
  return PHASE_COLORS[phaseType] ?? "text-muted-foreground";
}

function getPhaseIcon(phaseType: string): typeof Megaphone {
  return PHASE_ICONS[phaseType] ?? Megaphone;
}

export function PhaseTimeline({ phases, activePhaseId: externalActive, onPhaseClick }: PhaseTimelineProps) {
  const [activePhaseId, setActivePhaseId] = useState<string>(externalActive ?? phases[0]?.id ?? "");
  const phaseRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handlePhaseClick = (phaseId: string, el: HTMLButtonElement | null) => {
    const newActive = externalActive ?? phaseId;
    if (!externalActive) setActivePhaseId(phaseId);
    if (onPhaseClick) onPhaseClick(phaseId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const isActive = (phaseId: string) => (externalActive ?? activePhaseId) === phaseId;

  if (phases.length === 0) return null;

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center gap-0 min-w-fit px-2">
        {phases.map((phase, index) => {
          const phaseActive = isActive(phase.id);
          const Icon = getPhaseIcon(phase.phase);
          const color = getPhaseColor(phase.phase);
          const postCount = phase.posts?.length ?? 0;

          return (
            <div key={phase.id} className="flex items-center">
              <button
                ref={(el) => {
                  if (el) phaseRefs.current.set(phase.id, el);
                }}
                type="button"
                onClick={() => handlePhaseClick(phase.id, phaseRefs.current.get(phase.id) ?? null)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-sm min-h-10 transition-colors",
                  phaseActive && "bg-muted"
                )}
                aria-label={`Phase: ${phase.name}, ${postCount} posts`}
              >
                <div className={cn("flex size-8 items-center justify-center rounded-full border-2 transition-colors", color, phaseActive ? "border-current bg-background" : "border-border")}>
                  <Icon className="size-4" weight="fill" />
                </div>
                <span className={cn("text-xs font-medium max-w-20 truncate", phaseActive ? "text-foreground" : "text-muted-foreground")}>
                  {phase.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {postCount} {postCount === 1 ? "post" : "posts"}
                </span>
              </button>

              {index < phases.length - 1 && (
                <div className="flex items-center">
                  <div
                    className={cn(
                      "h-0.5 w-8 sm:w-12 transition-colors",
                      phaseActive ? "bg-foreground/30" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
