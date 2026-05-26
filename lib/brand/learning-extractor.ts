import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

// Schema for a single extracted signal
export const LearningSignalSchema = z.object({
  fieldName: z.string().describe('BrandContext field this signal affects'),
  direction: z.enum(['increase', 'decrease', 'avoid', 'replace']).describe('What the edit suggests'),
  magnitude: z.number().min(-1).max(1).describe('Strength of the signal (-1 to 1)'),
  confidence: z.number().min(0).max(1).describe('Confidence in this signal (0 to 1)'),
  diffSummary: z.string().describe('Human-readable summary of what changed'),
});

export type ExtractedSignal = z.infer<typeof LearningSignalSchema>;

// Schema for the full LLM response
export const SignalBatchSchema = z.object({
  signals: z.array(LearningSignalSchema),
});

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY ?? '',
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.1,
  maxRetries: 1,
});

const structuredModel = model.withStructuredOutput(SignalBatchSchema, {
  name: 'extract_learning_signals',
});

const SYSTEM_PROMPT = `You analyze differences between AI-generated content and user-edited content to extract brand voice learning signals.

For each meaningful edit the user made, extract a signal that could improve the brand context. Focus on voice/tone/style dimensions:
- emoji_usage: adding/removing emojis
- formality: making more/less formal
- sentence_length: shortening/lengthening sentences  
- hashtag_strategy: adding/removing/changing hashtags
- tone_shift: changing enthusiasm, confidence, assertiveness
- banned_words: user removed words that should be banned
- structural: changing format (list → paragraph, etc.)
- audience_focus: shifting who the content addresses

For each signal:
- fieldName: which BrandContext field this affects (e.g., "voiceDescription", "bannedWords", "tonePreset")
- direction: "increase" (more of this), "decrease" (less of this), "avoid" (never do this), "replace" (swap approach)
- magnitude: -1.0 to 1.0, how strong the change is
- confidence: 0.0 to 1.0, how sure you are this is intentional
- diffSummary: one sentence explaining what the user changed

Only extract signals that represent INTENTIONAL brand voice choices, not minor typos or grammar fixes. Return 0-5 signals.`;

export async function extractLearningSignals(params: {
  originalContent: string;
  editedContent: string;
  platform: string;
}): Promise<ExtractedSignal[]> {
  const { originalContent, editedContent, platform } = params;

  if (originalContent.trim() === editedContent.trim()) {
    logger.debug('learning.extract.no_changes', { platform });
    return [];
  }

  // Quick diff heuristic: if change is < 3 chars, skip LLM
  const charDiff = Math.abs(originalContent.length - editedContent.length);
  if (charDiff < 3 && originalContent.length > 50) {
    logger.debug('learning.extract.trivial_change', { charDiff, platform });
    return [];
  }

  logger.info('learning.extract.start', {
    platform,
    originalLen: originalContent.length,
    editedLen: editedContent.length,
  });

  try {
    const result = await structuredModel.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Original AI-generated content:\n---\n${originalContent}\n---\n\nUser-edited version:\n---\n${editedContent}\n---\n\nPlatform: ${platform}\n\nExtract learning signals from the differences.`,
      },
    ]);

    logger.info('learning.extract.complete', {
      platform,
      signalCount: result.signals.length,
    });

    return result.signals;
  } catch (err) {
    logger.error('learning.extract.error', { platform, error: String(err) });
    return [];
  }
}

// Persist extracted signals to the database
export async function persistLearningSignals(params: {
  brandContextId: string;
  signals: ExtractedSignal[];
  signalType: 'post_edit_diff' | 'thumbs_up' | 'thumbs_down' | 'auto_detected' | 'user_feedback';
  sourcePostId?: string;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const { brandContextId, signals, signalType, sourcePostId, metadata } = params;

  if (signals.length === 0) return 0;

  const records = signals.map((signal) => ({
    brandContextId,
    signalType,
    fieldName: signal.fieldName,
    direction: signal.direction,
    magnitude: signal.magnitude,
    confidence: signal.confidence,
    sourcePostId: sourcePostId ?? null,
    metadata: metadata ? { ...metadata, diffSummary: signal.diffSummary } : { diffSummary: signal.diffSummary },
    applied: false,
  }));

  await prisma.brandLearningSignal.createMany({
    data: records,
  });

  logger.info('learning.persist.complete', {
    brandContextId,
    count: records.length,
    signalType,
  });

  return records.length;
}
