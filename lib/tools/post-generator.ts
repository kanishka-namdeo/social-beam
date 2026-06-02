const PLATFORM_GUIDES: Record<string, { maxChars: number; style: string }> = {
  instagram: { maxChars: 2200, style: 'caption with emojis, line breaks, and hashtags at the end' },
  tiktok: { maxChars: 2200, style: 'short, punchy caption with relevant hashtags' },
  youtube: { maxChars: 5000, style: 'video description with timestamps if relevant, SEO keywords' },
  x: { maxChars: 280, style: 'concise tweet with 1-2 hashtags maximum' },
  linkedin: { maxChars: 3000, style: 'professional, insightful post with a clear call-to-action and 1-3 industry hashtags' },
};

const TONE_GUIDES: Record<string, string> = {
  professional: 'formal, authoritative, and polished',
  casual: 'friendly, conversational, and approachable',
  witty: 'humorous, clever, and engaging',
  educational: 'informative, structured, and value-focused',
  bold: 'direct, provocative, and attention-grabbing',
};

export function buildPostPrompt(topic: string, platform: string, tone: string): string {
  const platformGuide = PLATFORM_GUIDES[platform] ?? PLATFORM_GUIDES.linkedin;
  const toneGuide = TONE_GUIDES[tone] ?? TONE_GUIDES.professional;

  return `You are an expert social media content writer.

Write a ${platform} post about: "${topic}"

Style requirements:
- Tone: ${toneGuide}
- Format: ${platformGuide.style}
- Maximum length: ${platformGuide.maxChars} characters
- Include relevant emojis where appropriate for the platform
- Do NOT include hashtags unless the platform uses them (LinkedIn, Instagram, TikTok, YouTube)

Rules:
- The post must be ready to copy-paste directly
- Do not include meta-commentary or explanations
- Return ONLY the post text wrapped in a JSON object:
{"content":"the actual post text here"}

Do not include markdown formatting. Return only the JSON object.`;
}
