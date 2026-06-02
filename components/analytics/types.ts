export interface TimeSeriesPoint {
  date: string;
  impressions: number;
  engagements: number;
  clicks: number;
  engagementRate: number;
}

export interface PlatformMetrics {
  platform: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
  clicks: number;
  followers: number;
  netFollowers: number;
}

export interface RankedPost {
  rank: number;
  id: string;
  title: string | null;
  platform: string;
  engagementRate: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string;
  url?: string | null;
  isExternal?: boolean;
  fullText?: string | null;
}

export interface HeatmapSlot {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  hour: number; // 0-23
  avgEngagement: number;
  postCount: number;
}

export interface FollowerTrendPoint {
  date: string;
  platform: string;
  followers: number;
}
