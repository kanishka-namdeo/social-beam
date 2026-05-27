import type { BrandContextForAI } from "@/lib/ai/brand-context-loader";
import { PLATFORM_CHAR_LIMITS } from "@/lib/compose/constants";

const PLATFORM_DEFAULTS: Record<string, { style: string; hashtags: string; toneHint: string }> = {
  linkedin: {
    style: "Professional long-form post. Use clear paragraphs, data-driven insights, and thought leadership framing. Include a hook in the first 1-2 lines.",
    hashtags: "Use 3-5 relevant, niche hashtags. Place them at the end of the post.",
    toneHint: "Professional, authoritative, insight-focused. Avoid casual language.",
  },
  x: {
    style: "Short-form post under 280 characters. Punchy, direct, engaging. Can use threads if needed.",
    hashtags: "Use 1-2 hashtags maximum. Keep them concise.",
    toneHint: "Conversational, punchy, engaging. Can be slightly casual.",
  },
  instagram: {
    style: "Visual-first caption. Use line breaks for readability. Emojis are welcome. Include a call-to-action.",
    hashtags: "Use 10-15 mixed hashtags (niche + broad). Place them at the end.",
    toneHint: "Approachable, visual, authentic. Can use emojis and casual language.",
  },
  facebook: {
    style: "Conversational post. Medium length, friendly tone. Include engagement questions.",
    hashtags: "Use 2-3 hashtags. Facebook users prefer fewer hashtags.",
    toneHint: "Friendly, community-focused, conversational.",
  },
  tiktok: {
    style: "Video caption style. Short, hook-first, trend-aware. Include a question or CTA.",
    hashtags: "Use 3-5 trending + niche hashtags. Mix popular and specific.",
    toneHint: "Casual, trendy, energetic. Emojis are welcome.",
  },
  pinterest: {
    style: "Descriptive pin caption. Focus on value, keywords, and searchability.",
    hashtags: "Use 2-5 descriptive hashtags. Pinterest is a search engine.",
    toneHint: "Helpful, informative, aspirational.",
  },
};

interface ComposePrompt {
  platform: string;
  systemPrompt: string;
  userPrompt: string;
  charLimit: number | null;
}

export function buildComposePrompts(
  userPrompt: string,
  brandCtx: BrandContextForAI | null,
  targetPlatforms: string[],
): ComposePrompt[] {
  const prompts: ComposePrompt[] = [];

  for (const platform of targetPlatforms) {
    const platformDefault = PLATFORM_DEFAULTS[platform] ?? {
      style: "General social media post.",
      hashtags: "Use relevant hashtags.",
      toneHint: "Engaging and professional.",
    };

    const charLimit = PLATFORM_CHAR_LIMITS[platform] ?? null;

    let systemPrompt = `You are a social media content generator. Create an optimized post for ${platform}.

Content Style:
${platformDefault.style}

Tone Guidance:
${platformDefault.toneHint}

Hashtag Strategy:
${platformDefault.hashtags}

Character Limit: ${charLimit ? `Maximum ${charLimit} characters` : "No strict limit"}

IMPORTANT: Never use banned words from the brand context. If the generated content would naturally include a banned word, find an alternative phrasing.`;

    if (brandCtx) {
      systemPrompt += `\n\nBrand Context:\n`;
      systemPrompt += `Brand: ${brandCtx.brandSummary}\n`;
      if (brandCtx.identity.productDesc) {
        systemPrompt += `Product/Service: ${brandCtx.identity.productDesc}\n`;
      }
      if (brandCtx.voice.tonePreset) {
        systemPrompt += `Voice/Tone: ${brandCtx.voice.tonePreset}\n`;
      }
      if (brandCtx.voice.voiceDescription) {
        systemPrompt += `Voice Details: ${brandCtx.voice.voiceDescription}\n`;
      }
      if (brandCtx.audience.audienceType) {
        systemPrompt += `Audience Type: ${brandCtx.audience.audienceType}\n`;
      }
      if (brandCtx.goals.length > 0) {
        systemPrompt += `Business Goals: ${brandCtx.goals.join(", ")}\n`;
      }
      if (brandCtx.voice.bannedWords?.length) {
        systemPrompt += `\nBANNED WORDS (NEVER use these): ${brandCtx.voice.bannedWords.join(", ")}\n`;
      }

      const platformSpecific = brandCtx.platforms[platform];
      if (platformSpecific) {
        systemPrompt += `\n\nPlatform-Specific for ${platform}:\n`;
        if (platformSpecific.platformTone) {
          systemPrompt += `- Tone on ${platform}: ${platformSpecific.platformTone}\n`;
        }
        if (platformSpecific.platformRules?.length) {
          systemPrompt += `- Platform Rules:\n`;
          for (const rule of platformSpecific.platformRules) {
            systemPrompt += `  - ${rule}\n`;
          }
        }
      }
    }

    const userPromptText = `Create a ${platform} post about the following topic:

${userPrompt}

${charLimit ? `Keep it under ${charLimit} characters.` : ""}
Ensure the post matches the brand voice and platform style described above.`;

    prompts.push({
      platform,
      systemPrompt,
      userPrompt: userPromptText,
      charLimit,
    });
  }

  return prompts;
}
