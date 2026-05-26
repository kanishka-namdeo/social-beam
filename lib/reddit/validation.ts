import { z } from "zod";

export const AddSubredditSchema = z.object({
  subreddit: z.string().min(2).max(50).regex(/^[a-zA-Z0-9_]+$/, "Subreddit name can only contain letters, numbers, and underscores"),
  sortOrder: z.enum(["hot", "rising", "new"]).default("hot"),
});

export type AddSubredditInput = z.infer<typeof AddSubredditSchema>;
