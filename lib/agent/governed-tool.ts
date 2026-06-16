/**
 * Governed Tool — wraps tool execution with policy checking and per-tool rate limiting.
 */
import { tool } from '@langchain/core/tools';
import { z, type ZodType } from 'zod';
import { validateToolAccess, type AgentType } from './tool-policy';
import { logger } from '@/lib/logger';
import { slidingWindowRateLimit } from '@/lib/redis-rate-limiter';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 30;

export function createGovernedTool<TSchema extends ZodType>({
  toolName,
  agentType,
  description,
  schema,
  toolFn,
}: {
  toolName: string;
  agentType: AgentType;
  description: string;
  schema: TSchema;
  toolFn: (input: z.infer<TSchema>) => Promise<string>;
}) {
  const rateLimitKey = `${agentType}:${toolName}`;

  return tool(
    async (input: unknown) => {
      const access = validateToolAccess(agentType, toolName);

      if (!access.allowed) {
        logger.error('agent.governed_tool.denied', {
          agentType,
          toolName,
          reason: access.reason,
        });
        return JSON.stringify({
          error: `Access denied: ${access.reason}`,
        });
      }

      const rateLimit = await slidingWindowRateLimit(rateLimitKey, RATE_LIMIT_MAX_CALLS, RATE_LIMIT_WINDOW_MS);
      if (!rateLimit.allowed) {
        logger.warn('agent.governed_tool.rate_limited', {
          agentType,
          toolName,
          limit: RATE_LIMIT_MAX_CALLS,
          windowMs: RATE_LIMIT_WINDOW_MS,
        });
        return JSON.stringify({
          error: `Rate limit exceeded for ${toolName}. Max ${RATE_LIMIT_MAX_CALLS} calls per ${RATE_LIMIT_WINDOW_MS / 1000}s.`,
        });
      }

      logger.info('agent.governed_tool.invoked', {
        agentType,
        toolName,
        accessGranted: true,
        rateLimitRemaining: rateLimit.remaining,
      });

      return toolFn(input as z.infer<TSchema>);
    },
    {
      name: toolName,
      description,
      schema,
    },
  );
}
