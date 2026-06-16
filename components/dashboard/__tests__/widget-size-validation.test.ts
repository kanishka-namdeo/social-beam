import { describe, it, expect } from "vitest";
import { getChartHeight, validateWidgetSizeFitness, validateAllWidgetSizes } from "@/lib/dashboard/widget-types";
import { WIDGET_REGISTRY, getAllowedSizes, findNearestAllowedSize } from "@/lib/dashboard/widget-registry";

// Content type mapping for each widget (same as in validateAllWidgetSizes)
const WIDGET_CONTENT_TYPE: Record<string, string> = {
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

describe("Widget Size Validation", () => {
  describe("chart widgets have minimum 80px chart height at smallest non-narrow size", () => {
    const chartWidgets = Object.entries(WIDGET_CONTENT_TYPE)
      .filter(([_, type]) => type === "chart")
      .map(([id]) => id);

    it.each(chartWidgets)("%s has >= 80px chart height at smallest non-narrow size", (widgetId) => {
      const sizes = getAllowedSizes(widgetId);
      // Get smallest size with cols >= 4 (non-narrow)
      const nonNarrowSizes = sizes.filter((s) => s.w >= 4);
      expect(nonNarrowSizes.length).toBeGreaterThan(0);

      const smallest = nonNarrowSizes.reduce((min, s) => {
        const sArea = s.w * s.h;
        const minArea = min.w * min.h;
        return sArea < minArea ? s : min;
      }, nonNarrowSizes[0]);

      const chartHeight = getChartHeight(smallest.token as any);
      expect(chartHeight).toBeGreaterThanOrEqual(80);
    });
  });

  describe("list widgets can show 2+ items at smallest size", () => {
    const listWidgets = Object.entries(WIDGET_CONTENT_TYPE)
      .filter(([_, type]) => type === "list")
      .map(([id]) => id);

    it.each(listWidgets)("%s has rows >= 2 at smallest size", (widgetId) => {
      const sizes = getAllowedSizes(widgetId);
      expect(sizes.length).toBeGreaterThan(0);

      const smallest = sizes.reduce((min, s) => {
        const sArea = s.w * s.h;
        const minArea = min.w * min.h;
        return sArea < minArea ? s : min;
      }, sizes[0]);

      expect(smallest.h).toBeGreaterThanOrEqual(2);
    });
  });

  describe("no widget has 1-row at wide widths unless stats-bar", () => {
    const nonStatsBarWidgets = WIDGET_REGISTRY.filter(
      (w) => WIDGET_CONTENT_TYPE[w.id] !== "stats-bar"
    );

    it.each(nonStatsBarWidgets.map((w) => [w.id]))(
      "%s has no 1-row sizes at cols >= 5",
      (widgetId) => {
        const sizes = getAllowedSizes(widgetId);
        const violatingSizes = sizes.filter((s) => s.h === 1 && s.w >= 5);
        expect(violatingSizes).toHaveLength(0);
      }
    );
  });

  describe("validateAllWidgetSizes", () => {
    it("returns no errors for all widgets", () => {
      const errors = validateAllWidgetSizes();
      expect(errors).toEqual([]);
    });
  });

  describe("findNearestAllowedSize snaps removed sizes correctly", () => {
    it("snaps {w: 5, h: 1} for follower-growth to a valid size", () => {
      const result = findNearestAllowedSize({ w: 5, h: 1 }, "follower-growth");
      expect(result).toBeDefined();
      // Should not snap to 5x1 (which was removed)
      expect(result!.token).not.toBe("5x1");
      // Should be a valid size for follower-growth
      const allowedSizes = getAllowedSizes("follower-growth");
      const isValid = allowedSizes.some((s) => s.token === result!.token);
      expect(isValid).toBe(true);
    });
  });
});
