/**
 * Parses a posting cadence string into a weekly post count.
 *
 * Supported formats:
 * - "daily" → 7
 * - "3x/week" or "3 x / week" → 3
 * - "3 per week" → 3
 * - "weekly" → 1
 * - "biweekly" or "every 2 weeks" → 0.5
 * - null/undefined → null
 */
export function parseWeeklyCadence(cadence: string | null): number | null {
  if (!cadence) return null;
  const c = cadence.toLowerCase().trim();

  if (c === "daily") return 7;

  // Match patterns like "3x/week", "3 x / week", "5x week"
  const xPerWeek = c.match(/(\d+)\s*x\s*\/?\s*week/);
  if (xPerWeek) return parseInt(xPerWeek[1], 10);

  // Match patterns like "3 per week"
  const perWeek = c.match(/(\d+)\s*per\s*week/);
  if (perWeek) return parseInt(perWeek[1], 10);

  if (c === "weekly") return 1;

  if (c === "biweekly" || c.includes("every 2")) return 0.5;

  return null;
}

/**
 * Calculates total weekly target across all platforms.
 */
export function getTotalWeeklyTarget(
  platformContexts: Array<{ platform: string; postingCadence: string | null }> | undefined
): number {
  if (!platformContexts || platformContexts.length === 0) return 0;

  return platformContexts.reduce((total, ctx) => {
    const cadence = parseWeeklyCadence(ctx.postingCadence);
    return total + (cadence ?? 0);
  }, 0);
}

/**
 * Gets per-platform breakdown of scheduled vs target posts.
 */
export function getPlatformBreakdown(
  platformContexts: Array<{ platform: string; postingCadence: string | null }> | undefined,
  scheduledPosts: Array<{ platforms: Array<{ platform: string }> }>
): Array<{ platform: string; scheduled: number; target: number; cadence: string | null }> {
  if (!platformContexts || platformContexts.length === 0) return [];

  // Count scheduled posts per platform
  const scheduledCount = new Map<string, number>();
  for (const post of scheduledPosts) {
    for (const p of post.platforms) {
      scheduledCount.set(p.platform, (scheduledCount.get(p.platform) ?? 0) + 1);
    }
  }

  return platformContexts.map((ctx) => ({
    platform: ctx.platform,
    scheduled: scheduledCount.get(ctx.platform) ?? 0,
    target: parseWeeklyCadence(ctx.postingCadence) ?? 0,
    cadence: ctx.postingCadence,
  }));
}
