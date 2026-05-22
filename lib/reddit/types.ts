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

export const TrendAnalysisSchema = z.object({
  relevanceScore: z.number().min(0).max(1),
  isRelevant: z.boolean(),
  reason: z.string(),
  topicTags: z.array(z.string()),
  suggestedAction: z.string(),
});

export type TrendAnalysis = z.infer<typeof TrendAnalysisSchema>;
