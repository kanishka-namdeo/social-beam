import { useMemo } from "react";
import type { WidgetSizeToken } from "@/lib/dashboard/widget-types";
import { getSizeDerivatives, getChartHeight } from "@/lib/dashboard/widget-types";

/**
 * Hook that computes available dimensions for widget content based on size token.
 * Provides chart height, size derivatives, and layout flags.
 */
export function useWidgetDimensions(size: WidgetSizeToken | undefined) {
  return useMemo(() => {
    const derivatives = getSizeDerivatives(size);
    const chartHeight = getChartHeight(size);
    
    return {
      ...derivatives,
      chartHeight,
    };
  }, [size]);
}
