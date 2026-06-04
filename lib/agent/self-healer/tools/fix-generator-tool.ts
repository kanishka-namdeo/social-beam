/**
 * Fix Generator Tool — uses LLM to generate targeted code patches
 * for broken scraper selectors.
 */
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { logger } from '@/lib/logger';
import type { DOMDiff, CodePatch } from '../state';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY,
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.1,
  maxRetries: 2,
  timeout: 120_000,
});

const SCRAPER_FILES: Record<string, string> = {
  'creator-dashboard': 'lib/linkedin/creator-analytics-scraper.ts',
  'inbox': 'lib/inbox/scrapers/linkedin-scraper.ts',
  'browser-analytics': 'lib/linkedin/browser.ts',
};

const FIX_GENERATOR_PROMPT = `You are a code fix generator for LinkedIn scrapers. Given a DOM diff showing what selectors have changed, generate targeted code patches to fix the scraper.

Rules:
1. Only change selectors that are actually broken
2. Preserve the existing multi-strategy fallback pattern
3. Add new selectors as fallbacks rather than replacing existing ones
4. For CSS class changes, suggest class-pattern selectors like [class*="new-pattern"]
5. Keep changes minimal and targeted
6. Each patch must include the EXACT oldCode string that exists in the file
7. Confidence should be 0.8+ for simple selector additions, lower for structural changes

Return ONLY valid JSON matching this schema — no explanation, no markdown, no code fences:
{
  "patches": [
    {
      "filePath": "lib/path/to/file.ts",
      "oldCode": "exact code to replace (must match file exactly)",
      "newCode": "new code with fixes",
      "rationale": "why this fix is needed",
      "confidence": 0.9
    }
  ]
}
`;

export async function generateFixes(
  scraperName: string,
  diff: DOMDiff,
): Promise<CodePatch[]> {
  const log = logger.child({ scraperName });
  log.info('self-healer.fix_generator.start');

  const filePath = SCRAPER_FILES[scraperName];
  if (!filePath) {
    log.warn('self-healer.fix_generator.unknown_scraper', { scraperName });
    return [];
  }

  // Read current source file
  const projectRoot = resolve(process.cwd());
  const fullPath = resolve(projectRoot, filePath);

  let sourceCode: string;
  try {
    sourceCode = readFileSync(fullPath, 'utf-8');
  } catch {
    log.error('self-healer.fix_generator.file_not_found', { fullPath });
    return [];
  }

  // Check if there are any actual changes to fix
  const hasChanges =
    diff.changedSelectors.length > 0 ||
    diff.removedSelectors.length > 0 ||
    diff.missingTextLabels.length > 0;

  if (!hasChanges) {
    log.info('self-healer.fix_generator.no_changes_needed');
    return [];
  }

  const prompt = `
SCRAPER: ${scraperName}
FILE: ${filePath}

DOM DIFF:
- Changed selectors: ${JSON.stringify(diff.changedSelectors)}
- Removed selectors: ${JSON.stringify(diff.removedSelectors)}
- Missing text labels: ${JSON.stringify(diff.missingTextLabels)}
- New text labels: ${JSON.stringify(diff.newTextLabels)}
- Structural changes: ${JSON.stringify(diff.structuralChanges)}

CURRENT SOURCE CODE:
\`\`\`typescript
${sourceCode}
\`\`\`

Generate patches to fix the broken selectors. Return the patches as JSON.
`;

  try {
    const response = await model.invoke([
      new SystemMessage(FIX_GENERATOR_PROMPT),
      new HumanMessage(prompt),
    ]);

    const rawContent = typeof response.content === 'string' ? response.content : '';
    const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(cleaned) as { patches: Array<{ filePath: string; oldCode: string; newCode: string; rationale: string; confidence: number }> };

    const patches: CodePatch[] = (result.patches || []).map(p => ({
      scraperName,
      filePath: p.filePath,
      oldCode: p.oldCode,
      newCode: p.newCode,
      rationale: p.rationale,
      confidence: p.confidence,
    }));

    // Filter low-confidence patches
    const confidenceThreshold = 0.6;
    const highConfidencePatches = patches.filter(p => p.confidence >= confidenceThreshold);
    const skippedPatches = patches.filter(p => p.confidence < confidenceThreshold);

    if (skippedPatches.length > 0) {
      log.warn('self-healer.fix_generator.skipped_low_confidence', {
        count: skippedPatches.length,
        patches: skippedPatches.map(p => ({ rationale: p.rationale, confidence: p.confidence })),
      });
    }

    log.info('self-healer.fix_generator.complete', {
      totalPatches: patches.length,
      highConfidencePatches: highConfidencePatches.length,
      skippedPatches: skippedPatches.length,
    });

    return highConfidencePatches;
  } catch (error) {
    log.error('self-healer.fix_generator.error', { error: String(error) });
    return [];
  }
}
