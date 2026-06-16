import { logger } from '@/lib/logger';

const log = logger.child({ module: 'prompt-sanitizer' });

/**
 * Known injection patterns that attempt to override system instructions.
 * These are checked case-insensitively against user-generated and scraped content.
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instructions/gi, label: 'ignore_previous' },
  { pattern: /ignore\s+(all\s+)?above\s+instructions/gi, label: 'ignore_above' },
  { pattern: /disregard\s+(all\s+)?previous/gi, label: 'disregard_previous' },
  { pattern: /disregard\s+(all\s+)?above/gi, label: 'disregard_above' },
  { pattern: /forget\s+(all\s+)?(your\s+)?instructions/gi, label: 'forget_instructions' },
  { pattern: /forget\s+(all\s+)?(your\s+)?rules/gi, label: 'forget_rules' },
  { pattern: /you\s+are\s+now\s+(a|an)\s+/gi, label: 'role_switch' },
  { pattern: /new\s+instructions?:/gi, label: 'new_instructions' },
  { pattern: /new\s+role:/gi, label: 'new_role' },
  { pattern: /role:\s*user/gi, label: 'role_user' },
  { pattern: /role:\s*system/gi, label: 'role_system' },
  { pattern: /system:\s*/gi, label: 'system_prefix' },
  { pattern: /assistant:\s*/gi, label: 'assistant_prefix' },
  { pattern: /override\s+(previous|all|your)/gi, label: 'override' },
  { pattern: /jailbreak/gi, label: 'jailbreak' },
  { pattern: /\bDAN\b.*do\s+anything\s+now/gi, label: 'dan_jailbreak' },
  { pattern: /do\s+anything\s+now/gi, label: 'do_anything_now' },
  { pattern: /pretend\s+you\s+are/gi, label: 'pretend_role' },
  { pattern: /act\s+as\s+if\s+you\s+are/gi, label: 'act_as_if' },
  { pattern: /act\s+as\s+(a|an)\s+/gi, label: 'act_as' },
  { pattern: /respond\s+as\s+(a|an)\s+/gi, label: 'respond_as' },
  { pattern: /from\s+now\s+on\s+you\s+are/gi, label: 'from_now_on' },
  { pattern: /from\s+now\s+on\s+your\s+role/gi, label: 'from_now_on_role' },
  { pattern: /your\s+new\s+(role|task|job|function)/gi, label: 'new_role_assignment' },
  { pattern: /stop\s+(following|obeying)\s+(your\s+)?(instructions|rules)/gi, label: 'stop_following' },
  { pattern: /do\s+not\s+follow\s+(your\s+)?(instructions|rules)/gi, label: 'do_not_follow' },
  { pattern: /reveal\s+your\s+(system|initial)\s+prompt/gi, label: 'reveal_prompt' },
  { pattern: /show\s+me\s+your\s+(system|initial)\s+prompt/gi, label: 'show_prompt' },
  { pattern: /what\s+(are|were)\s+your\s+(original\s+)?instructions/gi, label: 'what_instructions' },
  { pattern: /repeat\s+your\s+(system|initial)\s+prompt/gi, label: 'repeat_prompt' },
];

/**
 * Zero-width and invisible Unicode characters that could hide instructions.
 */
const INVISIBLE_CHARS = [
  '\u200B', // Zero-width space
  '\u200C', // Zero-width non-joiner
  '\u200D', // Zero-width joiner
  '\u200E', // Left-to-right mark
  '\u200F', // Right-to-left mark
  '\u202A', // Left-to-right embedding
  '\u202B', // Right-to-left embedding
  '\u202C', // Pop directional formatting
  '\u202D', // Left-to-right override
  '\u202E', // Right-to-left override
  '\u2060', // Word joiner
  '\u2061', // Function application
  '\u2062', // Invisible times
  '\u2063', // Invisible separator
  '\u2064', // Invisible plus
  '\uFEFF', // Zero-width no-break space (BOM)
  '\u00AD', // Soft hyphen
];

const INVISIBLE_CHARS_REGEX = new RegExp(`[${INVISIBLE_CHARS.join('')}]`, 'g');

/**
 * Strip HTML/XML-like tags that could be used to fake system delimiters.
 */
const FAKE_DELIMITER_REGEX = /<\/?(?:system|assistant|user|human|ai|bot|instruction|prompt)[^>]*>/gi;

/**
 * Sanitize untrusted text before interpolating it into LLM prompts.
 *
 * Security purpose: This is the first line of defense against prompt injection.
 * It strips known injection patterns, invisible Unicode, and fake delimiters
 * from user-generated or scraped content before it reaches the model.
 *
 * @param text - The untrusted text to sanitize
 * @param context - Optional context label for logging (e.g., "brand_context.businessName")
 * @returns Sanitized text safe for prompt interpolation
 */
export function sanitizeForPrompt(text: string, context?: string): string {
  if (!text) return text;

  let sanitized = text;
  const strippedPatterns: string[] = [];

  // 1. Remove invisible Unicode characters
  if (INVISIBLE_CHARS_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(INVISIBLE_CHARS_REGEX, '');
    strippedPatterns.push('invisible_unicode');
  }

  // 2. Remove fake system/assistant delimiters
  if (FAKE_DELIMITER_REGEX.test(sanitized)) {
    sanitized = sanitized.replace(FAKE_DELIMITER_REGEX, '');
    strippedPatterns.push('fake_delimiters');
  }

  // 3. Strip known injection patterns
  for (const { pattern, label } of INJECTION_PATTERNS) {
    // Reset regex state (global flag)
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, '[FILTERED]');
      strippedPatterns.push(label);
    }
  }

  // 4. Normalize excessive whitespace (but preserve intentional line breaks)
  sanitized = sanitized.replace(/[ \t]{2,}/g, ' ');
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  // 5. Log if anything was stripped
  if (strippedPatterns.length > 0) {
    log.warn('prompt_sanitizer.stripped_content', {
      context: context ?? 'unknown',
      patterns: [...new Set(strippedPatterns)],
      originalLength: text.length,
      sanitizedLength: sanitized.length,
    });
  }

  return sanitized;
}

/**
 * Check if text contains injection patterns without modifying it.
 *
 * @param text - The text to check
 * @returns Object with `detected` boolean and array of matched pattern labels
 */
export function containsInjectionPatterns(text: string): { detected: boolean; patterns: string[] } {
  if (!text) return { detected: false, patterns: [] };

  const patterns: string[] = [];

  for (const { pattern, label } of INJECTION_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      patterns.push(label);
    }
  }

  // Check for invisible characters
  if (INVISIBLE_CHARS_REGEX.test(text)) {
    patterns.push('invisible_unicode');
  }

  // Check for fake delimiters
  if (FAKE_DELIMITER_REGEX.test(text)) {
    patterns.push('fake_delimiters');
  }

  return {
    detected: patterns.length > 0,
    patterns: [...new Set(patterns)],
  };
}

/**
 * Sanitize brand context fields before prompt interpolation.
 *
 * Security purpose: Brand context fields are user-provided and could be poisoned
 * with injection payloads. This sanitizes all string fields while preserving
 * the structure of the brand context object.
 *
 * @param fields - Record of brand context fields
 * @returns Sanitized copy of the fields
 */
export function sanitizeBrandContext<T extends Record<string, string | string[] | null | undefined>>(
  fields: T,
): T {
  const result = {} as T;

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeForPrompt(value, `brand_context.${key}`);
    } else if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeForPrompt(item, `brand_context.${key}[]`) : item,
      );
    } else {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
}
