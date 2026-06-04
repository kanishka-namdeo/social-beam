/**
 * DOM Probe Tool — captures structured DOM snapshots from LinkedIn pages
 * for self-healing scraper analysis.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const DOMProbeSchema = z.object({
  workspaceId: z.string().describe('Workspace ID for LinkedIn session'),
  targetUrl: z.string().describe('URL to probe (e.g., /analytics/creator/content/)'),
  scraperName: z.string().describe('Scraper identifier (creator-dashboard, inbox, browser-analytics)'),
});

/**
 * JavaScript to extract CSS classes, text labels, and element counts from the DOM.
 */
const CAPTURE_DOM_JS = `
(() => {
  // Extract all CSS class names matching known scraper patterns
  const allElements = document.querySelectorAll('*');
  const cssClasses = new Set();
  const patterns = [
    /^feed-shared-/,
    /^social-details-/,
    /^analytics-statistics__/,
    /^comments-comment-/,
    /^social-detail-/,
    /^pv-member-stats__/,
    /^occludable-update/,
    /^update-components/,
    /^feed-shared-actor__/,
    /^attributed-text/,
    /^break-words/,
  ];

  for (const el of allElements) {
    for (const cls of el.classList) {
      for (const pattern of patterns) {
        if (pattern.test(cls)) {
          cssClasses.add(cls);
        }
      }
    }
  }

  // Extract text labels (lines that contain known metric labels)
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

  // Element counts for key selector patterns
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

  return {
    cssClasses: Array.from(cssClasses),
    textLabels,
    elementCounts,
    fullText: fullText.slice(0, 50000), // cap text length
  };
})()
`;

export const domProbeTool = tool(
  async (input: unknown) => {
    const { workspaceId, targetUrl, scraperName } = DOMProbeSchema.parse(input);
    const start = Date.now();

    logger.info('self-healer.dom_probe.start', { scraperName, targetUrl, workspaceId });

    try {
      const { withLinkedInPageForUser } = await import('@/lib/linkedin/browser');

      const snapshot = await withLinkedInPageForUser(workspaceId, async (page) => {
        const fullUrl = targetUrl.startsWith('http')
          ? targetUrl
          : `https://www.linkedin.com${targetUrl}`;

        await page.goto(fullUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });

        // Stabilize render
        await new Promise((r) => setTimeout(r, 8000));

        // Check for session expiry
        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.includes('/uas/oauth')) {
          throw new Error('LinkedIn session expired during DOM probe');
        }

        // Capture DOM
        const domData = await page.evaluate(CAPTURE_DOM_JS) as {
          cssClasses: string[];
          textLabels: string[];
          elementCounts: Record<string, number>;
          fullText: string;
        };

        // Capture screenshot for visual reference
        const screenshot = await page.screenshot({ fullPage: false, type: 'jpeg' }).catch(() => undefined);

        return {
          scraperName,
          url: fullUrl,
          capturedAt: new Date().toISOString(),
          cssClasses: domData.cssClasses,
          textLabels: domData.textLabels,
          elementCounts: domData.elementCounts,
          fullText: domData.fullText,
          screenshot: screenshot ? `data:image/jpeg;base64,${screenshot.toString('base64')}` : undefined,
        };
      });

      if (!snapshot) {
        logger.warn('self-healer.dom_probe.no_session', { scraperName });
        return JSON.stringify({ error: 'No LinkedIn session available', scraperName });
      }

      logger.info('self-healer.dom_probe.complete', {
        scraperName,
        cssClassCount: snapshot.cssClasses.length,
        textLabelCount: snapshot.textLabels.length,
        duration: Date.now() - start,
      });

      return JSON.stringify(snapshot);
    } catch (error) {
      logger.error('self-healer.dom_probe.error', {
        scraperName,
        error: String(error),
        duration: Date.now() - start,
      });
      return JSON.stringify({ error: String(error), scraperName });
    }
  },
  {
    name: 'dom_probe',
    description: 'Capture a structured DOM snapshot from a LinkedIn page for self-healing analysis. Returns CSS classes, text labels, and element counts for known scraper selectors.',
    schema: DOMProbeSchema,
  },
);
