import { z } from "zod";

export const RedditPostSchema = z.object({
  title: z.string(),
  url: z.string(),
  author: z.string(),
  upvotes: z.number(),
  commentCount: z.number(),
  subreddit: z.string(),
  createdAt: z.date(),
});

export type RedditPost = z.infer<typeof RedditPostSchema>;

export const TrendSentimentSchema = z.enum(["positive", "neutral", "controversial"]);
export const TrendRiskLevelSchema = z.enum(["low", "medium", "high"]);

export type TrendSentiment = z.infer<typeof TrendSentimentSchema>;
export type TrendRiskLevel = z.infer<typeof TrendRiskLevelSchema>;

export const TrendAnalysisSchema = z.object({
  relevanceScore: z.number().min(0).max(1),
  isRelevant: z.boolean(),
  reason: z.string(),
  brandReasonTags: z.array(z.string()).optional().default([]),
  topicTags: z.array(z.string()),
  suggestedAction: z.string(),
  sentiment: TrendSentimentSchema.default("neutral"),
  riskLevel: TrendRiskLevelSchema.default("low"),
  riskReason: z.string().default("No risk factors identified"),
});

export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;

export interface AnalysisResult {
  relevanceScore: number;
  isRelevant: boolean;
  reason: string;
  brandReasonTags: string[];
  topicTags: string[];
  suggestedAction: string;
  sentiment: string;
  riskLevel: string;
  riskReason: string;
}

export interface TrendingPost {
  id: string;
  subreddit: string;
  title: string;
  url: string;
  author: string;
  upvotes: number;
  commentCount: number;
  relevanceScore: number | null;
  relevanceReason: string | null;
  brandReasonTags: string[];
  isActionable: boolean;
  topicTags: string[];
  suggestedAction: string | null;
  sentiment?: string | null;
  riskLevel?: string | null;
  riskReason?: string | null;
  dismissedAt?: Date | null;
  actedOnAt?: Date | null;
  scrapedAt?: Date | null;
  // Phase 5 UI enhancements - optional fields
  trendPhase?: string | null;
  maxCommentDepth?: number | null;
  intentScore?: number | null;
  intentType?: string | null;
  intentSignals?: unknown;
}

export function isAiAnalysisFailed(reason: string | null | undefined): boolean {
  return reason != null && reason.toLowerCase().includes("analysis failed");
}

export function getRelevanceBadgeClass(score: number, failed = false): string {
  if (failed) return "bg-warning/10 text-warning border-warning/20";
  if (score >= 0.7) return "bg-ai-confidence-high/10 text-ai-confidence-high";
  if (score >= 0.4) return "bg-ai-confidence-medium/10 text-ai-confidence-medium";
  return "bg-ai-confidence-low/10 text-ai-confidence-low";
}

export function getRelevanceLabel(score: number, failed = false): string {
  if (failed) return "AI Unavailable";
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
}
