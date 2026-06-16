import type { ReactNode } from "react";
import { WIDGET_REGISTRY } from "./widget-registry";

/**
 * Size token format: "{cols}x{rows}" where cols is the literal grid column span (1-10)
 * and rows is the row count (1-4). E.g. "5x2" = 5 columns, 2 rows.
 */
export type WidgetSizeToken =
  | "1x1" | "1x2" | "1x3" | "1x4"
  | "2x1" | "2x2" | "2x3" | "2x4"
  | "3x1" | "3x2" | "3x3" | "3x4"
  | "4x1" | "4x2" | "4x3" | "4x4"
  | "5x1" | "5x2" | "5x3" | "5x4"
  | "6x1" | "6x2" | "6x3" | "6x4"
  | "7x1" | "7x2" | "7x3" | "7x4"
  | "8x1" | "8x2" | "8x3" | "8x4"
  | "9x1" | "9x2" | "9x3" | "9x4"
  | "10x1" | "10x2" | "10x3" | "10x4";

/**
 * Role tiers for widget visibility gating
 */
export type WidgetRole = "FREE_USER" | "PREMIUM_USER" | "ADMIN";

/**
 * Widget categories for grouping in customize dialog
 */
export type WidgetCategory =
  | "analytics"
  | "content"
  | "ai"
  | "operational"
  | "social"
  | "admin";

/**
 * Common props passed to all widget components
 */
export interface BaseWidgetProps {
  /** Size token determining widget dimensions (e.g. "5x2", "10x1") */
  size?: WidgetSizeToken;
  /** Whether the widget is in a loading state */
  isLoading?: boolean;
  /** Optional className override for the Card wrapper */
  className?: string;
}

/**
 * Size derivative booleans for adaptive rendering
 */
export interface SizeDerivatives {
  /** Narrow width (cols <= 3) */
  isNarrow: boolean;
  /** Standard width (cols 4-6) */
  isStandard: boolean;
  /** Wide width (cols >= 7) */
  isWide: boolean;
  /** Single row height (h=1) */
  isCompact: boolean;
  /** Multi-row height (h>=2) */
  isExpanded: boolean;
  /** Tall widget (h>=3) */
  isTall: boolean;
  /** Raw column span (1-10) */
  cols: number;
  /** Raw row span (1, 2, 3, or 4) */
  rows: number;
}

/**
 * Compute size derivatives from a size token
 */
export function getSizeDerivatives(size: WidgetSizeToken | undefined): SizeDerivatives {
  if (!size) {
    return {
      isNarrow: false,
      isStandard: true,
      isWide: false,
      isCompact: false,
      isExpanded: true,
      isTall: false,
      cols: 5,
      rows: 2,
    };
  }

  const [cols, rows] = size.split("x").map(Number);

  return {
    isNarrow: cols <= 3,
    isStandard: cols >= 4 && cols <= 6,
    isWide: cols >= 7,
    isCompact: rows === 1,
    isExpanded: rows >= 2,
    isTall: rows >= 3,
    cols,
    rows,
  };
}

/** Grid configuration constants matching widget-grid-v2.tsx */
export const GRID_ROW_HEIGHT = 80;
export const GRID_MARGIN = 16;

/** Estimated header height in px (CardHeader pt-6 + pb-3 + content) */
export const WIDGET_HEADER_HEIGHT = 52;
/** Estimated content padding in px (CardContent px-6 + pb-6) */
export const WIDGET_CONTENT_PADDING = 48;
/** Estimated legend height in px */
export const WIDGET_LEGEND_HEIGHT = 40;

/**
 * Options for fine-tuning chart height calculation.
 */
export interface ChartHeightOptions {
  /** Whether the chart has a legend (~40px). Default: false */
  hasLegend?: boolean;
  /** Whether the widget has a header (~64px for WidgetHeader). Default: true */
  hasHeader?: boolean;
  /** Content area vertical padding in px. Default: 32 (CardContent py-4) */
  padding?: number;
}

/**
 * Calculate the estimated available chart height for a widget size.
 * Accounts for header, legend, padding, and a safety margin.
 *
 * Formula: totalHeight = (rows * 80) + ((rows - 1) * 16)
 *          chartHeight = totalHeight - headerHeight - legendHeight - padding
 */
export function getChartHeight(
  size: WidgetSizeToken | undefined,
  options?: ChartHeightOptions,
): number {
  const { rows } = getSizeDerivatives(size);
  const totalHeight = rows * GRID_ROW_HEIGHT + (rows - 1) * GRID_MARGIN;

  const hasHeader = options?.hasHeader ?? true;
  const headerHeight = hasHeader ? WIDGET_HEADER_HEIGHT : 0;
  const legendHeight = options?.hasLegend ? WIDGET_LEGEND_HEIGHT : 0;
  const padding = options?.padding ?? 32;

  return Math.max(40, totalHeight - headerHeight - legendHeight - padding);
}

/**
 * Header configuration for widget headers
 */
export interface WidgetHeaderConfig {
  /** Widget title text */
  title: string;
  /** Phosphor icon name (imported from @phosphor-icons/react/ssr) */
  icon?: ReactNode;
  /** Optional description/subtitle */
  description?: string;
  /** Optional action element (button, menu, etc.) */
  action?: ReactNode;
  /** Whether to show the title text (defaults to true). Pass false for compact sizes. */
  showTitle?: boolean;
}

/**
 * Size-based display configuration
 */
export interface SizeConfig {
  /** Whether to show the widget title */
  showTitle: boolean;
  /** Whether to show the widget description */
  showDescription: boolean;
  /** Layout density */
  layout: "compact" | "standard" | "expanded";
  /** Maximum items to display (undefined = no limit) */
  maxItems?: number;
}

/**
 * Get display configuration based on size token
 */
export function getSizeConfig(size: WidgetSizeToken | undefined): SizeConfig {
  if (!size) {
    return { showTitle: true, showDescription: false, layout: "standard" };
  }

  const { isCompact, isTall, isWide, isNarrow } = getSizeDerivatives(size);

  if (isCompact) {
    return { showTitle: false, showDescription: false, layout: "compact" };
  }

  if (isTall) {
    return { showTitle: true, showDescription: true, layout: "expanded", maxItems: isWide ? 10 : 6 };
  }

  if (isWide) {
    return { showTitle: true, showDescription: true, layout: "standard" };
  }

  if (isNarrow) {
    return { showTitle: false, showDescription: false, layout: "compact" };
  }

  return { showTitle: true, showDescription: false, layout: "standard" };
}

// ---------------------------------------------------------------------------
// Size fitness validation
// ---------------------------------------------------------------------------

export type WidgetContentType = "chart" | "list" | "stats-bar" | "status" | "mixed";

/**
 * Validate that a widget's allowed sizes produce usable layouts.
 *
 * Rules:
 * 1. Chart widgets: no size should have rows=1 AND cols >= 5 (chart needs vertical space)
 * 2. List widgets: the smallest size (by area) must have rows >= 2 (need space for 2+ items)
 * 3. Non-stats-bar widgets: no size should have rows=1 AND cols >= 5 (1-row at wide widths only for stats bars)
 *
 * Returns an array of validation error strings (empty = all valid).
 */
export function validateWidgetSizeFitness(
  widgetId: string,
  sizes: Array<{ token: string; w: number; h: number }>,
  contentType: WidgetContentType,
): string[] {
  const errors: string[] = [];

  if (sizes.length === 0) {
    errors.push(`${widgetId}: widget has no allowed sizes`);
    return errors;
  }

  // Rule 1: chart widgets - no size should have rows=1 AND cols >= 5
  if (contentType === "chart") {
    for (const s of sizes) {
      if (s.h === 1 && s.w >= 5) {
        errors.push(
          `${widgetId}: chart widget allows ${s.token} (rows=${s.h}, cols=${s.w}) but charts need vertical space - no 1-row at cols >= 5`,
        );
      }
    }
  }

  // Rule 2: list widgets - smallest size (by area) must have rows >= 2
  if (contentType === "list") {
    const smallest = sizes.reduce((min, s) => {
      const sArea = s.w * s.h;
      const minArea = min.w * min.h;
      return sArea < minArea ? s : min;
    }, sizes[0]);
    if (smallest.h < 2) {
      errors.push(
        `${widgetId}: list widget smallest size ${smallest.token} has rows=${smallest.h}, need rows >= 2 for 2+ items`,
      );
    }
  }

  // Rule 3: non-stats-bar widgets - no 1-row at wide widths (cols >= 5)
  if (contentType !== "stats-bar") {
    for (const s of sizes) {
      if (s.h === 1 && s.w >= 5) {
        errors.push(
          `${widgetId}: allows ${s.token} (1 row at cols=${s.w}) but only stats-bar widgets may use 1-row at wide widths`,
        );
      }
    }
  }

  return errors;
}

/**
 * Validate all widgets in the registry.
 * Returns an array of all validation errors (empty = all valid).
 */
export function validateAllWidgetSizes(): string[] {

  // Content type mapping for each widget
  const contentTypeMap: Record<string, WidgetContentType> = {
    // chart widgets
    "follower-growth": "chart",
    "competitor-benchmark": "chart",
    "sentiment-analysis": "chart",
    "best-time-to-post": "chart",
    // list widgets
    "recent-posts": "list",
    "unified-inbox": "list",
    "content-queue": "list",
    "ai-content-suggestions": "list",
    // stats-bar widgets
    "quick-stats": "stats-bar",
    "failure-alert": "stats-bar",
    "anomaly-alerts": "stats-bar",
    // status widgets
    "system-health": "status",
    // mixed widgets
    "posting-streak": "mixed",
    "insights": "mixed",
    "calendar-preview": "mixed",
    "trending-radar": "mixed",
    "profile-analysis": "mixed",
    "workspace-usage": "mixed",
  };

  const allErrors: string[] = [];
  for (const widget of WIDGET_REGISTRY) {
    const ct = contentTypeMap[widget.id] ?? "mixed";
    const sizes = widget.sizes.map((s: { token: string; w: number; h: number }) => ({
      token: s.token,
      w: s.w,
      h: s.h,
    }));
    const errors = validateWidgetSizeFitness(widget.id, sizes, ct);
    allErrors.push(...errors);
  }
  return allErrors;
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  /** Icon to display */
  icon?: ReactNode;
  /** Main message */
  message: string;
  /** Optional description */
  description?: string;
  /** Optional CTA button */
  cta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}
