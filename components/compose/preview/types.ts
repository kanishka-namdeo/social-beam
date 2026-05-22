export interface AccountInfo {
  platform: string;
  platformUsername: string | null;
  avatarUrl: string | null;
  followerCount: number | null;
}

export interface PreviewProps {
  content: string;
  title?: string;
  account?: AccountInfo;
}
