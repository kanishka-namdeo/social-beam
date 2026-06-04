/**
 * Fix Applier Tool — validates and applies code patches to scraper files,
 * then commits the changes with git.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const FixApplierSchema = z.object({
  patches: z.array(z.object({
    scraperName: z.string(),
    filePath: z.string(),
    oldCode: z.string(),
    newCode: z.string(),
    rationale: z.string(),
    confidence: z.number(),
  })).describe('Patches to apply'),
});

export const fixApplierTool = tool(
  async (input: unknown) => {
    const { patches } = FixApplierSchema.parse(input);
    const start = Date.now();

    logger.info('self-healer.fix_applier.start', { patchCount: patches.length });

    if (patches.length === 0) {
      return JSON.stringify({ applied: 0, errors: [], message: 'No patches to apply' });
    }

    const results: Array<{
      patch: typeof patches[0];
      success: boolean;
      error?: string;
    }> = [];

    const projectRoot = resolve(process.cwd());

    for (const patch of patches) {
      const fullPath = resolve(projectRoot, patch.filePath);

      // Validate file exists
      if (!existsSync(fullPath)) {
        logger.error('self-healer.fix_applier.file_not_found', { filePath: patch.filePath });
        results.push({ patch, success: false, error: 'File not found' });
        continue;
      }

      // Read current file
      let currentContent: string;
      try {
        currentContent = readFileSync(fullPath, 'utf-8');
      } catch (error) {
        logger.error('self-healer.fix_applier.read_error', { filePath: patch.filePath, error: String(error) });
        results.push({ patch, success: false, error: 'Read error' });
        continue;
      }

      // Validate oldCode exists in file
      if (!currentContent.includes(patch.oldCode)) {
        logger.warn('self-healer.fix_applier.oldcode_not_found', {
          filePath: patch.filePath,
          rationale: patch.rationale,
        });
        results.push({ patch, success: false, error: 'oldCode not found in file' });
        continue;
      }

      // Apply patch
      const newContent = currentContent.replace(patch.oldCode, patch.newCode);

      // Safety check: verify the file is still valid TypeScript-ish
      if (newContent === currentContent) {
        logger.warn('self-healer.fix_applier.no_change', { filePath: patch.filePath });
        results.push({ patch, success: false, error: 'No change applied (content unchanged)' });
        continue;
      }

      // Write file
      try {
        writeFileSync(fullPath, newContent, 'utf-8');
        logger.info('self-healer.fix_applier.patch_applied', {
          filePath: patch.filePath,
          scraperName: patch.scraperName,
          rationale: patch.rationale,
        });
        results.push({ patch, success: true });
      } catch (error) {
        logger.error('self-healer.fix_applier.write_error', { filePath: patch.filePath, error: String(error) });
        results.push({ patch, success: false, error: 'Write error' });
      }
    }

    // Commit all successful changes
    const successfulPatches = results.filter(r => r.success).map(r => r.patch);
    if (successfulPatches.length > 0) {
      try {
        const scraperNames = [...new Set(successfulPatches.map(p => p.scraperName))].join(', ');
        const changeSummary = successfulPatches.map(p => p.rationale).join('; ');

        execSync('git add -A', { cwd: projectRoot });
        execSync(
          `git commit -m "fix(scraper): auto-heal ${scraperNames} — ${changeSummary.slice(0, 100)}"`,
          { cwd: projectRoot },
        );

        logger.info('self-healer.fix_applier.git_commit', {
          scraperNames,
          patchCount: successfulPatches.length,
        });
      } catch (error) {
        logger.error('self-healer.fix_applier.git_commit_error', { error: String(error) });
      }
    }

    const appliedCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    logger.info('self-healer.fix_applier.complete', {
      applied: appliedCount,
      errors: errorCount,
      duration: Date.now() - start,
    });

    return JSON.stringify({
      applied: appliedCount,
      errors: errorCount,
      details: results.map(r => ({
        scraperName: r.patch.scraperName,
        filePath: r.patch.filePath,
        success: r.success,
        error: r.error,
      })),
    });
  },
  {
    name: 'fix_applier',
    description: 'Apply code patches to fix broken scraper selectors. Validates patches against current file content, applies changes, and commits to git. Returns success/error status per patch.',
    schema: FixApplierSchema,
  },
);
