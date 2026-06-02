"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  indicatorColor,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  indicatorColor?: string;
}) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative flex h-0.5 w-full items-center overflow-x-hidden rounded-none bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all duration-300"
        style={{
          transform: `translateX(-${100 - (value || 0)}%)`,
          ...(indicatorColor ? { backgroundColor: indicatorColor } : {}),
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
