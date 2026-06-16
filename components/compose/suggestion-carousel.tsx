"use client";

import { useReducer, useEffect, useCallback } from "react";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { CaretLeft, CaretRight, Lock } from "@phosphor-icons/react/ssr";
import { cn } from "@/lib/utils";
import { VariantCard } from "./variant-card";

interface SuggestionCarouselProps {
  variants: Record<number, string>;
  variantComplete: Set<number>;
  selectedVariantId: number | null;
  variantIds: number[];
  onSelect: (variantId: number, content: string) => void;
  isPremium: boolean;
}

type CarouselState = {
  activeIndex: number;
  prevCompleteCount: number;
  userNavigated: boolean;
};

type CarouselAction =
  | { type: "VARIANTS_CHANGED" }
  | { type: "VARIANT_COMPLETED"; variantIds: number[]; variantComplete: Set<number> }
  | { type: "USER_NAVIGATE"; index: number }
  | { type: "NEXT"; maxIndex: number }
  | { type: "PREV" };

function carouselReducer(state: CarouselState, action: CarouselAction): CarouselState {
  switch (action.type) {
    case "VARIANTS_CHANGED":
      return { ...state, userNavigated: false };

    case "VARIANT_COMPLETED": {
      if (state.userNavigated) return state;

      const completedIndices = action.variantIds
        .map((vid, idx) => ({ vid, idx }))
        .filter(({ vid }) => action.variantComplete.has(vid));

      if (completedIndices.length > 0) {
        const latestCompleted = completedIndices[completedIndices.length - 1];
        return {
          ...state,
          activeIndex: latestCompleted.idx,
          prevCompleteCount: action.variantComplete.size,
        };
      }
      return { ...state, prevCompleteCount: action.variantComplete.size };
    }

    case "USER_NAVIGATE":
      return { ...state, activeIndex: action.index, userNavigated: true };

    case "NEXT":
      return {
        ...state,
        activeIndex: Math.min(action.maxIndex, state.activeIndex + 1),
        userNavigated: true,
      };

    case "PREV":
      return {
        ...state,
        activeIndex: Math.max(0, state.activeIndex - 1),
        userNavigated: true,
      };

    default:
      return state;
  }
}

export function SuggestionCarousel({
  variants,
  variantComplete,
  selectedVariantId,
  variantIds,
  onSelect,
  isPremium,
}: SuggestionCarouselProps) {
  const [state, dispatch] = useReducer(carouselReducer, {
    activeIndex: 0,
    prevCompleteCount: 0,
    userNavigated: false,
  });

  const { activeIndex } = state;

  // Auto-advance to newly completed variants during streaming
  useEffect(() => {
    dispatch({ type: "VARIANT_COMPLETED", variantIds, variantComplete });
  }, [variantComplete, variantIds]);

  // Reset user navigation flag when variants change (e.g., new generation)
  useEffect(() => {
    dispatch({ type: "VARIANTS_CHANGED" });
  }, [variants]);

  const goToPrev = useCallback(() => {
    dispatch({ type: "PREV" });
  }, []);

  const goToNext = useCallback(() => {
    dispatch({ type: "NEXT", maxIndex: variantIds.length - 1 });
  }, [variantIds.length]);

  const goToIndex = useCallback((index: number) => {
    dispatch({ type: "USER_NAVIGATE", index });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrev, goToNext]);

  // Touch swipe handling
  const handleDragEnd = (_: MouseEvent | PointerEvent | TouchEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x < -threshold) {
      goToNext();
    } else if (info.offset.x > threshold) {
      goToPrev();
    }
  };

  const currentVid = variantIds[activeIndex];
  const currentContent = variants[currentVid] ?? "";
  const isCurrentComplete = variantComplete.has(currentVid);
  const isCurrentFree = currentVid === 0;
  const showLocked = !isPremium && !isCurrentFree;

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      className="relative space-y-3"
    >
      {/* Card area with navigation arrows */}
      <div className="relative">
        {/* Previous arrow */}
        {variantIds.length > 1 && (
          <button
            onClick={goToPrev}
            disabled={activeIndex === 0}
            aria-label="Previous suggestion"
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center min-h-10 min-w-10 rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-colors duration-normal",
              activeIndex === 0 && "opacity-30 cursor-not-allowed"
            )}
          >
            <CaretLeft className="size-5" weight="bold" />
          </button>
        )}

        {/* Card content */}
        <div className="mx-12 min-h-[200px]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeIndex}
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              aria-live="polite"
            >
              {showLocked ? (
                <div className="relative rounded-sm border border-border bg-muted/30 flex flex-col items-center justify-center min-h-[200px]">
                  <div className="relative z-10 flex flex-col items-center gap-1 text-muted-foreground">
                    <Lock className="size-5" weight="fill" />
                    <span className="text-xs font-medium">Premium</span>
                  </div>
                </div>
              ) : (
                <VariantCard
                  variantId={currentVid}
                  content={currentContent}
                  isComplete={isCurrentComplete}
                  isSelected={selectedVariantId === currentVid}
                  onSelect={onSelect}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next arrow */}
        {variantIds.length > 1 && (
          <button
            onClick={goToNext}
            disabled={activeIndex === variantIds.length - 1}
            aria-label="Next suggestion"
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center min-h-10 min-w-10 rounded-full bg-card border border-border shadow-sm hover:bg-muted transition-colors duration-normal",
              activeIndex === variantIds.length - 1 && "opacity-30 cursor-not-allowed"
            )}
          >
            <CaretRight className="size-5" weight="bold" />
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {variantIds.length > 1 && (
        <div className="flex justify-center gap-2">
          {variantIds.map((vid, idx) => (
            <button
              key={vid}
              onClick={() => goToIndex(idx)}
              aria-label={`Go to suggestion ${idx + 1} of ${variantIds.length}`}
              className={cn(
                "size-2 rounded-full transition-all duration-normal",
                idx === activeIndex
                  ? "bg-brand scale-125"
                  : "bg-border hover:bg-muted-foreground"
              )}
            />
          ))}
        </div>
      )}

      {/* Single dot for single variant */}
      {variantIds.length === 1 && (
        <div className="flex justify-center">
          <div className="size-2 rounded-full bg-brand" />
        </div>
      )}
    </div>
  );
}
