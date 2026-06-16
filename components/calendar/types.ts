export interface MediaItem {
  type: "image" | "video" | string;
  url: string;
}

export interface CampaignInfo {
  id: string;
  name: string;
  status: string;
}

export interface PostAnalytics {
  impressions: number;
  engagementRate: number;
  likes: number;
  comments: number;
}

export interface PostItem {
  id: string;
  title: string | null;
  content: string | null;
  status: string;
  confidence: string | null;
  category: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  platforms: { platform: string; status: string }[];
  media?: MediaItem[];
  campaign?: CampaignInfo | null;
  analytics?: PostAnalytics | null;
}

export interface IdeaItem {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  source: string;
  status: string;
  targetDate: string | null;
  convertedToPostId: string | null;
}

export interface CalendarNote {
  id: string;
  date: string;
  title: string;
  description: string | null;
  blockScheduling: boolean;
  color: string | null;
}
