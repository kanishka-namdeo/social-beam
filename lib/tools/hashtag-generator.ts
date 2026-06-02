const PLATFORM_COUNTS: Record<string, { min: number; max: number }> = {
  instagram: { min: 3, max: 5 },
  tiktok: { min: 3, max: 5 },
  youtube: { min: 2, max: 3 },
  x: { min: 1, max: 2 },
  linkedin: { min: 1, max: 3 },
};

export function buildHashtagPrompt(topic: string, platform: string): string {
  const counts = PLATFORM_COUNTS[platform] ?? { min: 3, max: 5 };

  return `You are an expert social media hashtag generator.

Generate hashtags for a ${platform} post about: "${topic}"

Generate ${counts.min}-${counts.max} hashtags total, organized into these categories:
- niche (low-volume, high-intent, 10K-200K posts)
- industry (broad topical tags for algorithm classification)
- trending (timely, seasonal, or event-based)
- audience (who the content targets)
- branded (unique to the brand/campaign)

Rules:
- All hashtags must be lowercase with no spaces
- No banned or spammy tags
- Each hashtag must be relevant to the topic and platform
- Return ONLY valid JSON in this exact format:
{"categories":[{"name":"niche","tags":["#tag1","#tag2"]},{"name":"industry","tags":["#tag3"]}]}

Do not include markdown formatting. Return only the JSON object.`;
}
