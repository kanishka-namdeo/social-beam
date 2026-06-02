import { z } from 'zod';

export const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'x', 'linkedin'] as const;
export const TONES = ['professional', 'casual', 'witty', 'educational', 'bold'] as const;

export const HashtagSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
  platform: z.enum(PLATFORMS),
});

export const PostSchema = z.object({
  topic: z.string().min(1, 'Topic is required').max(500, 'Topic too long'),
  platform: z.enum(PLATFORMS),
  tone: z.enum(TONES).default('professional'),
});

export type HashtagInput = z.infer<typeof HashtagSchema>;
export type PostInput = z.infer<typeof PostSchema>;
