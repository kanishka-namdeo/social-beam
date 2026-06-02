import { logger } from "@/lib/logger";

/**
 * Wraps any async node execution with a timeout.
 * Throws a structured error on timeout with the node label for downstream categorization.
 */
export class NodeTimeoutError extends Error {
  constructor(
    message: string,
    public readonly nodeLabel: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = "NodeTimeoutError";
  }
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  const log = logger.child({ node: label, timeoutMs: ms });
  log.debug("agent.timeout_guard.start", { label });

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      log.warn("agent.timeout_guard.timed_out", { label, timeoutMs: ms });
      reject(
        new NodeTimeoutError(
          `Node "${label}" timed out after ${ms}ms`,
          label,
          ms,
        ),
      );
    }, ms);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
