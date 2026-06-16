import { containsInjectionPatterns } from '@/lib/ai/prompt-sanitizer';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'context-screening' });

/**
 * Screen checkpoint data for potential injection patterns before loading into agent context.
 * Recursively scans string values in the data structure.
 */
export function screenCheckpointData(data: unknown): { safe: boolean; flagged?: string[] } {
  const flagged: string[] = [];

  function scan(value: unknown, path: string = ''): void {
    if (typeof value === 'string') {
      const result = containsInjectionPatterns(value);
      if (result.detected) {
        flagged.push(`${path}: ${result.patterns.join(', ')}`);
        log.warn('checkpoint.screening.injection_detected', {
          path,
          patterns: result.patterns,
        });
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, idx) => scan(item, `${path}[${idx}]`));
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, val]) => scan(val, path ? `${path}.${key}` : key));
    }
  }

  scan(data);

  if (flagged.length > 0) {
    log.warn('checkpoint.screening.flagged', { count: flagged.length });
    return { safe: false, flagged };
  }

  return { safe: true };
}

/**
 * Strip suspicious content from checkpoint data.
 * Returns cleaned data with injection patterns removed.
 */
export function sanitizeCheckpointData<T>(data: T): T {
  if (typeof data === 'string') {
    // Remove common injection patterns
    return data
      .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[REDACTED]')
      .replace(/you\s+are\s+now/gi, '[REDACTED]')
      .replace(/new\s+instructions?:/gi, '[REDACTED]')
      .replace(/system:/gi, '[REDACTED]')
      .replace(/assistant:/gi, '[REDACTED]') as T;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeCheckpointData(item)) as T;
  }

  if (data && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = sanitizeCheckpointData(value);
    }
    return result as T;
  }

  return data;
}
