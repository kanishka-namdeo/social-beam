"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarDots, PencilSimple, LinkSimple } from "@phosphor-icons/react/ssr";

const startingActions = [
  {
    label: "Plan your week",
    description: "Generate 5-7 posts for the week",
    icon: CalendarDots,
    href: "/dashboard/compose?mode=plan",
  },
  {
    label: "Write a post",
    description: "Start composing with AI assistance",
    icon: PencilSimple,
    href: "/dashboard/compose",
  },
  {
    label: "Connect accounts",
    description: "Link your social media profiles",
    icon: LinkSimple,
    href: "/dashboard/settings?tab=accounts",
  },
];

export function StartingVerbs() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {startingActions.map((action) => (
        <Link key={action.label} href={action.href} className="block min-w-0 overflow-hidden">
          <Button
            variant="outline"
            className="flex h-auto w-full flex-col items-start gap-2 p-4 text-left hover:bg-muted/50 transition-colors overflow-hidden"
          >
            <div className="flex items-center gap-2 w-full min-w-0">
              <action.icon className="size-5 text-brand shrink-0" weight="regular" />
              <span className="font-medium text-foreground truncate">{action.label}</span>
            </div>
            <span className="text-xs text-muted-foreground w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {action.description}
            </span>
          </Button>
        </Link>
      ))}
    </div>
  );
}
