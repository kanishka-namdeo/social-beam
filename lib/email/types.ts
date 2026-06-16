export type EmailResult = {
  success: boolean;
  id?: string;
  error?: string;
};

export type WelcomeEmailPayload = {
  email: string;
  name: string;
};

export type VerificationEmailPayload = {
  email: string;
  name: string;
  verificationUrl: string;
};

export type PasswordResetEmailPayload = {
  email: string;
  name: string;
  resetUrl: string;
};

export type ReceiptEmailPayload = {
  email: string;
  name: string;
  amount: number;
  currency: string;
  plan: string;
  periodEnd: Date;
  invoicePdf?: string;
};

export type PublishNotificationPayload = {
  email: string;
  name: string;
  publishedCount: number;
  failedCount: number;
  results: Array<{
    title?: string;
    platforms: string[];
    status: 'PUBLISHED' | 'FAILED';
    error?: string;
  }>;
};

export type EngagementDigestPayload = {
  email: string;
  name: string;
  commentCount: number;
  mentionCount: number;
  dmCount: number;
  totalUnread: number;
};

export type RedditDigestPayload = {
  email: string;
  name: string;
  trends: Array<{
    title: string;
    subreddit: string;
    upvotes: number;
    relevanceScore: number | null;
    intentScore: number | null;
    url: string;
  }>;
  highIntentCount: number;
};
