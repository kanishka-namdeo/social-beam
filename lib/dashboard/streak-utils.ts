export function calculateStreak(dates: Date[]) {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0, lastPostDate: null };

  const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
  const lastPostDate = sorted[0];

  const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const uniqueDays = new Set(sorted.map(toDay));
  const dayArray = Array.from(uniqueDays).sort((a, b) => b - a);

  const today = toDay(new Date());
  const yesterday = today - 86400000;
  let currentStreak = 0;
  if (dayArray[0] === today || dayArray[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < dayArray.length; i++) {
      if (dayArray[i] === dayArray[i - 1] - 86400000) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  let longestStreak = 1;
  let tempStreak = 1;
  for (let i = 1; i < dayArray.length; i++) {
    if (dayArray[i] === dayArray[i - 1] - 86400000) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  return { currentStreak, longestStreak, lastPostDate };
}

export function calculateConsistencyScore(publishedPosts: { publishedAt: Date | null }[]): number {
  if (publishedPosts.length === 0) return 0;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const recentPosts = publishedPosts.filter((p) => p.publishedAt && p.publishedAt >= thirtyDaysAgo);

  const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const uniqueDays = new Set(recentPosts.map((p) => toDay(p.publishedAt!)));

  const targetDays = 15;
  return Math.min(100, Math.round((uniqueDays.size / targetDays) * 100));
}
