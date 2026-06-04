/**
 * Failure Detector Tool — validates scraper selectors against captured DOM
 * and calculates health scores per scraper.
 */
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const FailureDetectorSchema = z.object({
  domSnapshots: z.record(z.string(), z.any()).describe('DOM snapshots keyed by scraper name'),
});

// Known selectors per scraper (mirrors the actual scraper code)
const SCRAPER_CONFIGS: Record<string, { selectors: Record<string, string[]>; textLabels: string[] }> = {
  'creator-dashboard': {
    selectors: {
      analyticsLinks: ['a[href*="/analytics/post-summary/"]'],
      feedLinks: ['a[href*="/feed/update/"]'],
    },
    textLabels: [
      'impressions', 'members reached', 'social engagements', 'reactions',
      'comments', 'reposts', 'saves', 'sends on linkedin',
    ],
  },
  'inbox': {
    selectors: {
      postContainers: [
        'div.feed-shared-update-v2',
        'article[data-view-name="update"]',
        'div.update-components-container',
        'div.occludable-update',
      ],
      commentItems: [
        'div.comments-comment-item',
        'div.comment-item',
        'div.social-detail-comment',
        'li.comments-comment-item',
        'div[data-urn*="comment"]',
      ],
      postLinks: [
        "a[href*='/feed/update/']",
        "a[href*='/posts/']",
        "a[data-control-name='view_post_detail']",
      ],
    },
    textLabels: ['Show more', 'Show all', 'more replies', 'Post', 'Reply'],
  },
  'browser-analytics': {
    selectors: {
      reactions: [
        '.social-details-social-counts__reactions-count',
        '.social-details-social-counts__likes-count',
      ],
      comments: [
        '.social-details-social-counts__comments',
      ],
      shares: [
        '.social-details-social-counts__reposts',
        '.social-details-social-counts__reposts-count',
      ],
      impressions: [
        '[data-impressions-count]',
        '.analytics-statistics__impressions',
      ],
      engagementRate: [
        '[data-engagement-rate]',
        '.analytics-statistics__engagement-rate',
      ],
    },
    textLabels: [
      'impressions', 'engagement rate', 'clicks', 'saves',
      'profile views', 'unique impressions',
    ],
  },
};

export const failureDetectorTool = tool(
  async (input: unknown) => {
    const { domSnapshots } = FailureDetectorSchema.parse(input);
    const start = Date.now();

    logger.info('self-healer.failure_detector.start');

    const failures: Array<{
      scraperName: string;
      selectorType: string;
      selector: string;
      expectedMatches: number;
      actualMatches: number;
      healthScore: number;
      severity: 'critical' | 'warning' | 'info';
    }> = [];

    for (const [scraperName, snapshot] of Object.entries(domSnapshots as Record<string, { elementCounts: Record<string, number>; textLabels: string[] }>)) {
      const config = SCRAPER_CONFIGS[scraperName];
      if (!config) {
        logger.warn('self-healer.failure_detector.unknown_scraper', { scraperName });
        continue;
      }

      const elementCounts = snapshot.elementCounts || {};
      const capturedLabels = snapshot.textLabels || [];
      let totalSelectors = 0;
      let matchedSelectors = 0;

      // Check CSS selectors
      for (const [selectorType, selectors] of Object.entries(config.selectors)) {
        for (const selector of selectors) {
          totalSelectors++;
          const count = elementCounts[selector] ?? 0;

          if (count === 0) {
            failures.push({
              scraperName,
              selectorType,
              selector,
              expectedMatches: 1,
              actualMatches: 0,
              healthScore: 0,
              severity: selectorType === 'postContainers' || selectorType === 'analyticsLinks' ? 'critical' : 'warning',
            });
          } else {
            matchedSelectors++;
          }
        }
      }

      // Check text labels
      for (const expectedLabel of config.textLabels) {
        const found = capturedLabels.some((l: string) => l.toLowerCase().includes(expectedLabel.toLowerCase()));
        if (!found) {
          failures.push({
            scraperName,
            selectorType: 'text-label',
            selector: expectedLabel,
            expectedMatches: 1,
            actualMatches: 0,
            healthScore: 0,
            severity: 'warning',
          });
        }
      }

      const selectorHealth = totalSelectors > 0 ? (matchedSelectors / totalSelectors) * 100 : 100;
      const textLabelsMatched = config.textLabels.filter((label: string) =>
        capturedLabels.some((l: string) => l.toLowerCase().includes(label.toLowerCase()))
      ).length;
      const textHealth = config.textLabels.length > 0 ? (textLabelsMatched / config.textLabels.length) * 100 : 100;

      // Overall health: 70% selectors + 30% text labels
      const overallHealth = Math.round(selectorHealth * 0.7 + textHealth * 0.3);

      logger.info('self-healer.failure_detector.scraper_health', {
        scraperName,
        overallHealth,
        selectorHealth: Math.round(selectorHealth),
        textHealth: Math.round(textHealth),
        failureCount: failures.filter(f => f.scraperName === scraperName).length,
      });

      // Add a summary health entry
      failures.push({
        scraperName,
        selectorType: 'health-summary',
        selector: `overall_health_${overallHealth}`,
        expectedMatches: 100,
        actualMatches: overallHealth,
        healthScore: overallHealth,
        severity: overallHealth < 50 ? 'critical' : overallHealth < 80 ? 'warning' : 'info',
      });
    }

    logger.info('self-healer.failure_detector.complete', {
      totalFailures: failures.length,
      criticalFailures: failures.filter(f => f.severity === 'critical').length,
      duration: Date.now() - start,
    });

    return JSON.stringify({ failures, completedAt: new Date().toISOString() });
  },
  {
    name: 'failure_detector',
    description: 'Analyze DOM snapshots to detect scraper failures. Checks CSS selectors and text labels against known patterns and returns health scores per scraper.',
    schema: FailureDetectorSchema,
  },
);
