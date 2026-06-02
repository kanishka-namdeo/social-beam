export interface MediaAsset {
  id: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  width: number;
  height: number;
  publicUrl: string;
  status: string;
  tags: string[];
  createdAt: Date;
}

export interface ExternalMediaItem {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  userName: string;
  userUrl?: string;
  mimeType: string;
}
