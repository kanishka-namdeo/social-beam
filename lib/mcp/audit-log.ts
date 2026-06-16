import { prisma } from '@/lib/prisma';
import type { McpUserContext } from './types';
import { logger } from '@/lib/logger';

export async function logToolCall(
  ctx: McpUserContext,
  toolName: string,
  args: Record<string, unknown>,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        id: crypto.randomUUID(),
        workspaceId: ctx.workspaceId,
        type: 'MCP_TOOL_CALL',
        status: success ? 'COMPLETED' : 'FAILED',
        details: {
          tool: toolName,
          args: sanitizeArgs(args),
          error: errorMessage,
          userId: ctx.userId,
        } as any,
      },
    });
  } catch (error) {
    logger.error('mcp.audit_log.failed', { toolName, error: String(error) });
  }
}

function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...args };
  delete sanitized.accessToken;
  delete sanitized.refreshToken;
  delete sanitized.password;
  return sanitized;
}
