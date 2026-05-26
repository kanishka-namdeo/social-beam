import { prisma } from '@/lib/prisma';
import { Prisma } from '@/app/generated/prisma';
import { logger } from '@/lib/logger';

export interface AggregatedSignal {
  fieldName: string;
  direction: string;
  netMagnitude: number;
  signalCount: number;
  netConfidence: number;
  recencyWeighted: number;
  recencyDate: Date;
}

export interface FieldSuggestion {
  fieldName: string;
  currentValue: unknown;
  suggestedValue: unknown;
  confidence: number;
  signalCount: number;
  reasoning: string;
  createdAt: Date;
}

interface KalmanFieldState {
  confidence: number;
  stability: number;
  signalCount: number;
}

const RECENCY_DECAY_RATE = 0.9;
const MIN_SIGNALS_TO_SUGGEST = 3;
const MIN_NET_CONFIDENCE = 0.4;

export function kalmanUpdate(
  existing: KalmanFieldState,
  newSignal: { confidence: number },
): KalmanFieldState {
  if (newSignal.confidence < 0.3) {
    return existing;
  }

  const kalmanGain = existing.confidence / (existing.confidence + (1 - newSignal.confidence) + 0.1);
  const dampingFactor = existing.stability > 5 ? 0.3 : 1.0;
  const effectiveGain = kalmanGain * dampingFactor;

  return {
    confidence: Math.min(1, existing.confidence + effectiveGain * (newSignal.confidence - existing.confidence)),
    stability: existing.stability + 1,
    signalCount: existing.signalCount + 1,
  };
}

function weeksAgo(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return diffMs / (7 * 24 * 60 * 60 * 1000);
}

function applyRecency(confidence: number, weeks: number): number {
  return confidence * Math.pow(RECENCY_DECAY_RATE, weeks);
}

export async function aggregateSignals(brandContextId: string): Promise<AggregatedSignal[]> {
  logger.info('learning.aggregate.start', { brandContextId });

  const signals = await prisma.brandLearningSignal.findMany({
    where: {
      brandContextId,
      applied: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (signals.length === 0) {
    logger.debug('learning.aggregate.no_signals', { brandContextId });
    return [];
  }

  const grouped = new Map<string, typeof signals>();

  for (const signal of signals) {
    const key = `${signal.fieldName}:${signal.direction}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(signal);
  }

  const results: AggregatedSignal[] = [];

  for (const [key, group] of grouped.entries()) {
    let totalWeight = 0;
    let totalWeightedConfidence = 0;
    let totalMagnitude = 0;
    let latestDate = group[0].createdAt;

    for (const signal of group) {
      const weeks = weeksAgo(signal.createdAt);
      const weight = applyRecency(1.0, weeks);

      totalWeight += weight;
      totalWeightedConfidence += signal.confidence * weight;
      totalMagnitude += signal.magnitude * weight;

      if (signal.createdAt > latestDate) {
        latestDate = signal.createdAt;
      }
    }

    const netConfidence = totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
    const netMagnitude = totalWeight > 0 ? totalMagnitude / totalWeight : 0;

    const [fieldName, direction] = key.split(':');
    const oppositeSignals = await prisma.brandLearningSignal.count({
      where: {
        brandContextId,
        fieldName,
        applied: false,
        direction: { not: direction },
      },
    });

    const contradictionPenalty = oppositeSignals > 0 ? Math.max(0.4, 1 - (oppositeSignals * 0.2)) : 1.0;
    const adjustedConfidence = netConfidence * contradictionPenalty;

    results.push({
      fieldName,
      direction,
      netMagnitude,
      signalCount: group.length,
      netConfidence: adjustedConfidence,
      recencyWeighted: totalWeight,
      recencyDate: latestDate,
    });
  }

  results.sort((a, b) => b.netConfidence - a.netConfidence);

  logger.info('learning.aggregate.complete', {
    brandContextId,
    rawSignals: signals.length,
    groups: results.length,
  });

  return results;
}

export async function generateSuggestions(
  brandContextId: string,
  aggregated: AggregatedSignal[],
): Promise<FieldSuggestion[]> {
  logger.info('learning.suggestions.generate', { brandContextId, signalGroupCount: aggregated.length });

  const brandContext = await prisma.brandContext.findUnique({
    where: { id: brandContextId },
  });

  if (!brandContext) {
    logger.warn('learning.suggestions.no_context', { brandContextId });
    return [];
  }

  const suggestions: FieldSuggestion[] = [];

  for (const agg of aggregated) {
    if (agg.signalCount < MIN_SIGNALS_TO_SUGGEST || agg.netConfidence < MIN_NET_CONFIDENCE) {
      continue;
    }

    const currentValue = (brandContext as Record<string, unknown>)[agg.fieldName];

    let suggestedValue: unknown;
    let reasoning: string;

    switch (agg.fieldName) {
      case 'bannedWords': {
        const currentWords = (currentValue as string[]) ?? [];
        if (agg.direction === 'increase' || agg.direction === 'replace') {
          suggestedValue = [...currentWords];
          reasoning = `${agg.signalCount} edits suggest adding banned words. Review recent posts to identify patterns and add them here.`;
        } else if (agg.direction === 'decrease') {
          suggestedValue = currentWords.slice(0, Math.max(1, Math.floor(currentWords.length * 0.7)));
          reasoning = `${agg.signalCount} signals suggest some banned words could be relaxed. Consider removing the least-recently-triggered words.`;
        } else {
          suggestedValue = currentWords;
          reasoning = `${agg.signalCount} signals suggest banned words should ${agg.direction}. Review and adjust manually.`;
        }
        break;
      }
      case 'tonePreset': {
        const currentTone = (currentValue as string) ?? '';
        const toneShifts: Record<string, string> = {
          'professional': 'casual',
          'casual': 'professional',
          'witty': 'educational',
          'educational': 'witty',
          'bold': 'conversational',
          'conversational': 'bold',
        };
        if (agg.netMagnitude > 0.3 && toneShifts[currentTone]) {
          suggestedValue = toneShifts[currentTone];
          reasoning = `Strong signals (magnitude: ${agg.netMagnitude.toFixed(2)}) suggest shifting tone from "${currentTone}" toward "${toneShifts[currentTone]}".`;
        } else {
          suggestedValue = currentTone;
          reasoning = `Signals detected for tone but magnitude is low (${agg.netMagnitude.toFixed(2)}). Monitor for stronger patterns.`;
        }
        break;
      }
      case 'voiceDescription': {
        const currentDesc = (currentValue as string) ?? '';
        if (agg.netMagnitude !== 0) {
          suggestedValue = currentDesc;
          reasoning = `Edits consistently suggest voice description should be adjusted (${agg.direction === 'increase' ? 'more of this pattern' : 'less of this pattern'}). Update this field manually based on recent edit patterns.`;
        } else {
          suggestedValue = currentDesc;
          reasoning = `Signals detected for voice description but magnitude is negligible. Monitor for stronger patterns.`;
        }
        break;
      }
      default: {
        if (agg.direction === 'increase') {
          suggestedValue = currentValue;
          reasoning = `${agg.signalCount} signals suggest increasing ${agg.fieldName}. Review and adjust manually based on recent edit patterns.`;
        } else if (agg.direction === 'decrease') {
          suggestedValue = currentValue;
          reasoning = `${agg.signalCount} signals suggest decreasing ${agg.fieldName}. Review and adjust manually based on recent edit patterns.`;
        } else {
          suggestedValue = currentValue;
          reasoning = `${agg.signalCount} signals suggest ${agg.fieldName} should ${agg.direction}. Review and adjust manually.`;
        }
      }
    }

    if (suggestedValue !== undefined) {
      suggestions.push({
        fieldName: agg.fieldName,
        currentValue,
        suggestedValue,
        confidence: agg.netConfidence,
        signalCount: agg.signalCount,
        reasoning,
        createdAt: agg.recencyDate,
      });
    }
  }

  logger.info('learning.suggestions.generated', {
    brandContextId,
    suggestionCount: suggestions.length,
  });

  return suggestions;
}

export async function applySuggestion(
  brandContextId: string,
  fieldName: string,
  newValue: unknown,
): Promise<void> {
  logger.info('learning.suggestion.apply', { brandContextId, fieldName });

  await prisma.brandContext.update({
    where: { id: brandContextId },
    data: { [fieldName]: newValue },
  });

  await prisma.brandLearningSignal.updateMany({
    where: {
      brandContextId,
      fieldName,
      applied: false,
    },
    data: { applied: true },
  });

  const brandContext = await prisma.brandContext.findUnique({
    where: { id: brandContextId },
  });

  if (brandContext) {
    const currentFieldValue = (brandContext as Record<string, unknown>)[fieldName];
    await prisma.brandFieldState.upsert({
      where: {
        brandContextId_fieldName: {
          brandContextId,
          fieldName,
        },
      },
      create: {
        brandContextId,
        fieldName,
        currentValue: (currentFieldValue as Prisma.JsonObject) ?? Prisma.JsonNull,
        confidence: 0.7,
        stability: 1,
        signalCount: 0,
      },
      update: {
        currentValue: (currentFieldValue as Prisma.JsonObject) ?? Prisma.JsonNull,
        confidence: 0.7,
        stability: { increment: 1 },
        signalCount: { increment: 0 },
      },
    });
  }

  logger.info('learning.suggestion.applied', { brandContextId, fieldName });
}

export async function getSuggestions(brandContextId: string): Promise<FieldSuggestion[]> {
  logger.info('learning.suggestions.get', { brandContextId });
  const aggregated = await aggregateSignals(brandContextId);
  return generateSuggestions(brandContextId, aggregated);
}

export async function initializeFieldStates(brandContextId: string): Promise<void> {
  logger.info('learning.field_states.initialize', { brandContextId });

  const brandContext = await prisma.brandContext.findUnique({
    where: { id: brandContextId },
  });

  if (!brandContext) {
    logger.warn('learning.field_states.no_context', { brandContextId });
    return;
  }

  const fieldsToTrack = [
    'businessName', 'tagline', 'industry', 'productDesc',
    'tonePreset', 'voiceDescription', 'bannedWords',
    'audienceType', 'demographics', 'interests', 'painPoints',
    'competitors', 'goals',
  ];

  for (const fieldName of fieldsToTrack) {
    const fieldValue = (brandContext as Record<string, unknown>)[fieldName];
    await prisma.brandFieldState.upsert({
      where: {
        brandContextId_fieldName: { brandContextId, fieldName },
      },
      create: {
        brandContextId,
        fieldName,
        currentValue: (fieldValue as Prisma.JsonObject) ?? Prisma.JsonNull,
        confidence: 0.5,
        stability: 0,
        signalCount: 0,
      },
      update: {},
    });
  }

  logger.info('learning.field_states.initialized', { brandContextId, fieldCount: fieldsToTrack.length });
}
