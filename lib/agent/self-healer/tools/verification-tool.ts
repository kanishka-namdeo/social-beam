/**
 * Verification Tool — re-runs DOM probe and failure detection after fixes
 * are applied to confirm scrapers are healthy again.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import type { DOMSnapshot, ScraperFailure, VerificationResult } from '../state';

const VerificationSchema = z.object({
  workspaceId: z.string().describe('Workspace ID for LinkedIn session'),
  scraperNames: z.array(z.string()).describe('Scrapers to verify'),
  targetUrls: z.record(z.string(), z.string()).describe('URLs to probe per scraper'),
});

export const verificationTool = tool(
  async (input: unknown) => {
    const { workspaceId, scraperNames, targetUrls } = VerificationSchema.parse(input) as {
      workspaceId: string;
      scraperNames: string[];
      targetUrls: Record<string, string>;
    };
    const start = Date.now();

    logger.info('self-healer.verification.start', { scraperNames });

    const results: VerificationResult[] = [];

    for (const scraperName of scraperNames) {
      const targetUrl = targetUrls[scraperName];
      if (!targetUrl) {
        results.push({
          scraperName,
          verified: false,
          healthScore: 0,
          message: 'No target URL configured for scraper',
        });
        continue;
      }

      try {
        // Re-probe the DOM
        const { withLinkedInPageForUser } = await import('@/lib/linkedin/browser');

        const snapshot = await withLinkedInPageForUser(workspaceId, async (page) => {
          const fullUrl = targetUrl.startsWith('http')
            ? targetUrl
            : `https://www.linkedin.com${targetUrl}`;

          await page.goto(fullUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });

          await new Promise((r) => setTimeout(r, 8000));

          const currentUrl = page.url();
          if (currentUrl.includes('/login') || currentUrl.includes('/uas/oauth')) {
            throw new Error('LinkedIn session expired during verification');
          }

          // Re-run the same DOM capture logic
          const domData = await page.evaluate(`
            (() => {
              const allElements = document.querySelectorAll('*');
              const cssClasses = new Set();
              const patterns = [
                /^feed-shared-/, /^social-details-/, /^analytics-statistics__/,
                /^comments-comment-/, /^social-detail-/, /^pv-member-stats__/,
                /^occludable-update/, /^update-components/, /^feed-shared-actor__/, /^attributed-text/, /^break-words/,
              ];

              for (const el of allElements) {
                for (const cls of el.classList) {
                  for (const pattern of patterns) {
                    if (pattern.test(cls)) cssClasses.add(cls);
                  }
                }
              }

              const fullText = document.body?.innerText || '';
              const lines = fullText.split('\\n').map(l => l.trim()).filter(Boolean);
              const textLabels = [];
              const knownLabels = [
                'impressions', 'members reached', 'social engagements', 'reactions',
                'comments', 'reposts', 'saves', 'sends on linkedin',
                'engagement rate', 'clicks', 'profile views', 'unique impressions',
                'followers', 'connections', 'vs', 'prior',
              ];

              for (const line of lines) {
                const lower = line.toLowerCase();
                for (const label of knownLabels) {
                  if (lower.includes(label) && !textLabels.includes(line)) {
                    textLabels.push(line);
                  }
                }
              }

              const elementCounts = {
                'a[href*="/analytics/post-summary/"]': document.querySelectorAll('a[href*="/analytics/post-summary/"]').length,
                'a[href*="/feed/update/"]': document.querySelectorAll('a[href*="/feed/update/"]').length,
                'div.feed-shared-update-v2': document.querySelectorAll('div.feed-shared-update-v2').length,
                'div.comments-comment-item': document.querySelectorAll('div.comments-comment-item').length,
                '.social-details-social-counts__reactions-count': document.querySelectorAll('.social-details-social-counts__reactions-count').length,
                '.social-details-social-counts__comments': document.querySelectorAll('.social-details-social-counts__comments').length,
                'div.occludable-update': document.querySelectorAll('div.occludable-update').length,
                'div.comment-item': document.querySelectorAll('div.comment-item').length,
                'article[data-view-name="update"]': document.querySelectorAll('article[data-view-name="update"]').length,
                'div.update-components-container': document.querySelectorAll('div.update-components-container').length,
              };

              return { cssClasses: Array.from(cssClasses), textLabels, elementCounts, fullText: fullText.slice(0, 50000) };
            })()
          `) as { cssClasses: string[]; textLabels: string[]; elementCounts: Record<string, number>; fullText: string };

          return {
            scraperName,
            url: fullUrl,
            capturedAt: new Date().toISOString(),
            cssClasses: domData.cssClasses,
            textLabels: domData.textLabels,
            elementCounts: domData.elementCounts,
            fullText: domData.fullText,
          };
        });

        if (!snapshot) {
          results.push({
            scraperName,
            verified: false,
            healthScore: 0,
            message: 'No LinkedIn session available for verification',
          });
          continue;
        }

        // Calculate health score (same logic as failure detector)
        const knownSelectors: Record<string, string[]> = {
          'creator-dashboard': ['a[href*="/analytics/post-summary/"]'],
          'inbox': ['div.feed-shared-update-v2', 'div.comments-comment-item', 'div.occludable-update'],
          'browser-analytics': ['.social-details-social-counts__reactions-count', '.social-details-social-counts__comments'],
        };

        const selectors = knownSelectors[scraperName] || [];
        let matchedCount = 0;
        for (const selector of selectors) {
          if ((snapshot.elementCounts[selector] ?? 0) > 0) {
            matchedCount++;
          }
        }

        const selectorHealth = selectors.length > 0 ? (matchedCount / selectors.length) * 100 : 100;
        const knownLabels: Record<string, string[]> = {
          'creator-dashboard': ['impressions', 'members reached', 'social engagements'],
          'inbox': ['Show more', 'Post', 'Reply'],
          'browser-analytics': ['impressions', 'engagement rate', 'clicks'],
        };
        const labels = knownLabels[scraperName] || [];
        const matchedLabels = labels.filter(label =>
          snapshot.textLabels.some(l => l.toLowerCase().includes(label.toLowerCase()))
        ).length;
        const textHealth = labels.length > 0 ? (matchedLabels / labels.length) * 100 : 100;

        const overallHealth = Math.round(selectorHealth * 0.7 + textHealth * 0.3);
        const verified = overallHealth >= 70;

        results.push({
          scraperName,
          verified,
          healthScore: overallHealth,
          message: verified
            ? `Scraper healthy: ${overallHealth}% (selector: ${Math.round(selectorHealth)}%, text: ${Math.round(textHealth)}%)`
            : `Scraper still failing: ${overallHealth}% (selector: ${Math.round(selectorHealth)}%, text: ${Math.round(textHealth)}%)`,
        });

        logger.info('self-healer.verification.scraper_result', {
          scraperName,
          verified,
          healthScore: overallHealth,
        });
      } catch (error) {
        results.push({
          scraperName,
          verified: false,
          healthScore: 0,
          message: `Verification error: ${String(error)}`,
        });
        logger.error('self-healer.verification.error', { scraperName, error: String(error) });
      }
    }

    const allVerified = results.every(r => r.verified);

    logger.info('self-healer.verification.complete', {
      allVerified,
      verifiedCount: results.filter(r => r.verified).length,
      totalCount: results.length,
      duration: Date.now() - start,
    });

    return JSON.stringify({ results, allVerified, completedAt: new Date().toISOString() });
  },
  {
    name: 'verification',
    description: 'Re-verify scraper health after fixes are applied. Re-probes DOM and recalculates health scores to confirm fixes are working.',
    schema: VerificationSchema,
  },
);
