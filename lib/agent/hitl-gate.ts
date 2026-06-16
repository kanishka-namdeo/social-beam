/**
 * Human-in-the-Loop Gate — manages pending approvals for destructive agent actions.
 * Uses an in-memory store for MVP; can be migrated to DB-backed storage later.
 */
import { logger } from '@/lib/logger';

export interface PendingAction {
  id: string;
  action: string;
  details: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Date;
  resolvedAt?: Date;
  rejectReason?: string;
  resolve: (result: { approved: boolean; reason?: string }) => void;
}

const pendingActions = new Map<string, PendingAction>();
const MAX_PENDING_ACTIONS = 500;
const MAX_PENDING_AGE_MS = 30 * 60 * 1000; // 30 minutes

function evictStalePendingActions(): void {
  const now = Date.now();
  for (const [id, action] of pendingActions) {
    if (now - action.requestedAt.getTime() > MAX_PENDING_AGE_MS) {
      logger.warn('agent.hitl.stale_action_evicted', { actionId: id, action: action.action });
      if (action.status === 'pending') {
        action.resolve({ approved: false, reason: 'Evicted due to age' });
      }
      pendingActions.delete(id);
    }
  }
}

export function requestApproval(
  action: string,
  details: Record<string, unknown>,
): Promise<{ approved: boolean; reason?: string }> {
  const id = crypto.randomUUID();

  logger.info('agent.hitl.request', { actionId: id, action, details });

  if (pendingActions.size >= MAX_PENDING_ACTIONS) {
    evictStalePendingActions();
  }

  return new Promise<{ approved: boolean; reason?: string }>((resolve) => {
    const pending: PendingAction = {
      id,
      action,
      details,
      status: 'pending',
      requestedAt: new Date(),
      resolve,
    };

    pendingActions.set(id, pending);

    const timeout = setTimeout(() => {
      const entry = pendingActions.get(id);
      if (entry && entry.status === 'pending') {
        entry.status = 'rejected';
        entry.resolvedAt = new Date();
        entry.rejectReason = 'Approval timed out (10 minutes)';
        logger.warn('agent.hitl.timeout', { actionId: id, action });
        resolve({ approved: false, reason: 'Approval timed out' });
        pendingActions.delete(id);
      }
    }, 10 * 60 * 1000);

    pending.resolve = (result) => {
      clearTimeout(timeout);
      resolve(result);
    };
  });
}

export function approveAction(actionId: string): boolean {
  const pending = pendingActions.get(actionId);
  if (!pending) {
    logger.warn('agent.hitl.approve_not_found', { actionId });
    return false;
  }

  if (pending.status !== 'pending') {
    logger.warn('agent.hitl.approve_already_resolved', { actionId, status: pending.status });
    return false;
  }

  pending.status = 'approved';
  pending.resolvedAt = new Date();

  logger.info('agent.hitl.approved', { actionId, action: pending.action });

  pending.resolve({ approved: true });
  pendingActions.delete(actionId);
  return true;
}

export function rejectAction(actionId: string, reason: string): boolean {
  const pending = pendingActions.get(actionId);
  if (!pending) {
    logger.warn('agent.hitl.reject_not_found', { actionId });
    return false;
  }

  if (pending.status !== 'pending') {
    logger.warn('agent.hitl.reject_already_resolved', { actionId, status: pending.status });
    return false;
  }

  pending.status = 'rejected';
  pending.resolvedAt = new Date();
  pending.rejectReason = reason;

  logger.info('agent.hitl.rejected', { actionId, action: pending.action, reason });

  pending.resolve({ approved: false, reason });
  pendingActions.delete(actionId);
  return true;
}

export function listPendingApprovals(): Array<{
  id: string;
  action: string;
  details: Record<string, unknown>;
  status: string;
  requestedAt: Date;
}> {
  return Array.from(pendingActions.values()).map((a) => ({
    id: a.id,
    action: a.action,
    details: a.details,
    status: a.status,
    requestedAt: a.requestedAt,
  }));
}
