export interface MediaItem {
  type: "image" | "video" | string;
  url: string;
}

export interface PostItem {
  id: string;
  title: string | null;
  content: string | null;
  status: string;
  confidence: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  platforms: { platform: string; status: string }[];
  media?: MediaItem[];
}
