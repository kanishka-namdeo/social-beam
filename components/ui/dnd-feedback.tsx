"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DnDContextValue {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  activeId: string | null;
  setActiveId: (v: string | null) => void;
}

const DnDContext = createContext<DnDContextValue>({
  isDragging: false,
  setIsDragging: () => {},
  activeId: null,
  setActiveId: () => {},
});

export function useDnD() {
  return useContext(DnDContext);
}

interface DnDProviderProps {
  children: ReactNode;
}

export function DnDProvider({ children }: DnDProviderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <DnDContext.Provider value={{ isDragging, setIsDragging, activeId, setActiveId }}>
      {children}
    </DnDContext.Provider>
  );
}

interface DropZoneProps {
  children: ReactNode;
  className?: string;
  isActive?: boolean;
}

export function DropZone({ children, className, isActive }: DropZoneProps) {
  return (
    <div
      className={cn(
        "relative transition-all duration-[var(--duration-normal)]",
        isActive && "ring-2 ring-brand/50 bg-brand/5 rounded-sm scale-[1.01]",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface DraggableItemProps {
  children: ReactNode;
  className?: string;
  isDragging?: boolean;
  isSelected?: boolean;
}

export function DraggableItem({ children, className, isDragging, isSelected }: DraggableItemProps) {
  return (
    <div
      className={cn(
        "transition-all duration-[var(--duration-normal)]",
        isDragging && "opacity-50 scale-95",
        isSelected && "shadow-lg shadow-brand/20 ring-2 ring-brand/30",
        className,
      )}
    >
      {children}
    </div>
  );
}
