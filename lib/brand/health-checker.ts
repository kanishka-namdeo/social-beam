import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export interface BrandHealth {
  hasBrandContext: boolean;
  score: number;
  status: 'healthy' | 'needs_attention' | 'stale';
  fieldMetrics: {
    fieldName: string;
    confidence: number;
    stability: number;
    signalCount: number;
  }[];
  signalSummary: {
    total: number;
    applied: number;
    unapplied: number;
    recent7Days: number;
    byType: Record<string, number>;
  };
  lastTrainedAt: Date | null;
  trainingStatus: string;
  fieldsNeedingAttention: string[];
}

const CONFIDENCE_THRESHOLD = 0.4;
const RECENT_DAYS = 7;
const STALE_DAYS = 30;

function humanizeFieldName(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export async function checkBrandHealth(workspaceId: string): Promise<BrandHealth> {
  const log = logger.child({ workspaceId });
  log.info('brand.health.check', { workspaceId });

  const brandContext = await prisma.brandContext.findUnique({
    where: { workspaceId },
    select: { id: true, trainingStatus: true, lastTrainedAt: true },
  });

  if (!brandContext) {
    log.debug('brand.health.no_context', { workspaceId });
    return {
      hasBrandContext: false,
      score: 0,
      status: 'stale',
      fieldMetrics: [],
      signalSummary: { total: 0, applied: 0, unapplied: 0, recent7Days: 0, byType: {} },
      lastTrainedAt: null,
      trainingStatus: 'untrained',
      fieldsNeedingAttention: [],
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);

  const [fieldStates, allSignals, unappliedSignals, recentSignals] = await Promise.all([
    prisma.brandFieldState.findMany({
      where: { brandContextId: brandContext.id },
      select: { fieldName: true, confidence: true, stability: true, signalCount: true },
      orderBy: { confidence: 'asc' },
    }),
    prisma.brandLearningSignal.findMany({
      where: { brandContextId: brandContext.id },
      select: { signalType: true, applied: true, createdAt: true },
    }),
    prisma.brandLearningSignal.count({
      where: { brandContextId: brandContext.id, applied: false },
    }),
    prisma.brandLearningSignal.count({
      where: { brandContextId: brandContext.id, createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const appliedSignals = allSignals.filter((s) => s.applied).length;
  const byType: Record<string, number> = {};
  for (const signal of allSignals) {
    byType[signal.signalType] = (byType[signal.signalType] ?? 0) + 1;
  }

  const avgConfidence =
    fieldStates.length > 0
      ? fieldStates.reduce((sum, f) => sum + f.confidence, 0) / fieldStates.length
      : 0;

  const fieldsNeedingAttention = fieldStates
    .filter((f) => f.confidence < CONFIDENCE_THRESHOLD)
    .map((f) => humanizeFieldName(f.fieldName));

  const daysSinceTrained = brandContext.lastTrainedAt
    ? (now.getTime() - brandContext.lastTrainedAt.getTime()) / (24 * 60 * 60 * 1000)
    : Infinity;

  const isTrained = brandContext.trainingStatus === 'trained';
  const needsRefresh = brandContext.trainingStatus === 'needs_refresh';

  let score = 0;

  score += Math.round(avgConfidence * 40);

  const signalActivityScore = Math.min(20, allSignals.length * 2);
  score += signalActivityScore;

  const unappliedPenalty = Math.min(15, unappliedSignals * 2);
  score -= unappliedPenalty;

  if (daysSinceTrained <= STALE_DAYS) {
    score += 20;
  } else if (daysSinceTrained <= 60) {
    score += 10;
  }

  if (isTrained) {
    score += 20;
  } else if (needsRefresh) {
    score += 10;
  }

  score = Math.max(0, Math.min(100, score));

  let status: 'healthy' | 'needs_attention' | 'stale';
  if (score >= 70) {
    status = 'healthy';
  } else if (score >= 40) {
    status = 'needs_attention';
  } else {
    status = 'stale';
  }

  const fieldMetrics = fieldStates.map((f) => ({
    fieldName: humanizeFieldName(f.fieldName),
    confidence: Math.round(f.confidence * 100) / 100,
    stability: f.stability,
    signalCount: f.signalCount,
  }));

  const result: BrandHealth = {
    hasBrandContext: true,
    score,
    status,
    fieldMetrics,
    signalSummary: {
      total: allSignals.length,
      applied: appliedSignals,
      unapplied: unappliedSignals,
      recent7Days: recentSignals,
      byType,
    },
    lastTrainedAt: brandContext.lastTrainedAt,
    trainingStatus: brandContext.trainingStatus,
    fieldsNeedingAttention,
  };

  log.info('brand.health.complete', {
    workspaceId,
    score: result.score,
    status: result.status,
    fieldCount: fieldMetrics.length,
    signalTotal: result.signalSummary.total,
  });

  return result;
}
