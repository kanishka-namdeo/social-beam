/**
 * DOM Analyzer Tool — uses LLM to analyze DOM changes and identify
 * what changed when scraper failures are detected.
 */
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { logger } from '@/lib/logger';
import type { DOMSnapshot, DOMDiff, ScraperFailure } from '../state';

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY,
  configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
  modelName: process.env.MODEL ?? 'qwen3.6-plus',
  temperature: 0.1,
  maxRetries: 2,
  timeout: 120_000,
});

// Embed current scraper selectors as context for the LLM
const SCRAPER_SOURCE_CONTEXT = `
## creator-analytics-scraper.ts (Creator Dashboard)
- Uses text-based extraction, NOT CSS selectors
- Key patterns: findNumberByLabel(lines, "impressions"), findNumberByLabel(lines, "members reached"), etc.
- Post discovery: document.querySelectorAll('a[href*="/analytics/post-summary/"]')
- URN extraction: regex /urn:li:(activity|share|ugcPost):\\d+/
- Text patterns: /^([\\d,]+)\\s+impressions?$/i, /^([\\d,]+)\\s+engagements?$/i
- Time range: elements matching /^\\d+\\s+days?$/ with role="button"

## linkedin-scraper.ts (Inbox/Comments)
- SELECTOR_STRATEGIES.postContainers: "div.feed-shared-update-v2", "article[data-view-name='update']", "div.update-components-container", "div.occludable-update"
- SELECTOR_STRATEGIES.commentItems: "div.comments-comment-item", "div.comment-item", "div.social-detail-comment", "li.comments-comment-item", "div[data-urn*='comment']"
- SELECTOR_STRATEGIES.postLinks: "a[href*='/feed/update/']", "a[href*='/posts/']", "a[data-control-name='view_post_detail']"
- SELECTOR_STRATEGIES.commentText: "span.comments-comment-item__main-content", "span[class*='main-content']", "div[class*='comment-text']", "span[class*='break-words']", "div[class*='attributed-text']"
- SELECTOR_STRATEGIES.commentAuthor: "span.feed-shared-actor__name", "div.feed-shared-actor__description", "a[href*='/in/']", "span[class*='actor__name']"
- SELECTOR_STRATEGIES.showMoreReplies: "button[aria-label*='replies']", "button[aria-label*='more']", "button[role='button']"
- SELECTOR_STRATEGIES.commentInput: 'div[role="textbox"]', 'textarea[placeholder*="comment"]', 'div[class*="comment-box"] div[role="textbox"]', 'div[contenteditable="true"]'
- Text buttons: "Show more", "Show all", "more replies", "Post", "Reply"

## browser.ts (Analytics/Profile)
- ANALYTICS_SELECTORS.reactions: ".social-details-social-counts__reactions-count", ".social-details-social-counts__likes-count", "button[aria-label*='reactions']"
- ANALYTICS_SELECTORS.comments: ".social-details-social-counts__comments", "button[aria-label*='comments']"
- ANALYTICS_SELECTORS.shares: ".social-details-social-counts__reposts", ".social-details-social-counts__reposts-count", "button[aria-label*='reposts']"
- ANALYTICS_DASHBOARD_SELECTORS.impressions: '[data-impressions-count]', '.analytics-statistics__impressions', '[class*="impressions"]', 'div[class*="analytics"][class*="impressions"]', 'span[aria-label*="impressions"]'
- ANALYTICS_DASHBOARD_SELECTORS.uniqueImpressions: '[data-unique-impressions-count]', '.analytics-statistics__unique-impressions', '[class*="unique-impressions"]', 'span[aria-label*="unique impressions"]'
- ANALYTICS_DASHBOARD_SELECTORS.clicks: '[data-clicks-count]', '.analytics-statistics__clicks', '[class*="clicks"]', 'span[aria-label*="clicks"]'
- ANALYTICS_DASHBOARD_SELECTORS.engagementRate: '[data-engagement-rate]', '.analytics-statistics__engagement-rate', '[class*="engagement-rate"]', 'span[aria-label*="engagement rate"]'
- ANALYTICS_DASHBOARD_SELECTORS.saves: '[data-saves-count]', '.analytics-statistics__saves', '[class*="saves"]', 'span[aria-label*="saves"]'
- ANALYTICS_DASHBOARD_SELECTORS.profileViews: '[data-profile-views]', '.analytics-statistics__profile-views', '[class*="profile-views"]', 'span[aria-label*="profile views"]'
- Profile selectors: '[data-follower-count]', '.pv-member-stats__followers-count', '[class*="follower-count"]', 'a[href*="followers"] [class*="count"]', '[aria-label*="followers"]'
`;

const DOM_ANALYSIS_PROMPT = `You are a DOM change analyzer for LinkedIn scrapers. Your job is to compare the current DOM state against known scraper selectors and identify what has changed.

Given:
1. The current DOM snapshot (CSS classes present, text labels found, element counts)
2. The failures detected (selectors that no longer match)
3. The source code context (what selectors the scraper expects)

Identify:
- Which selectors have changed or been removed
- What new CSS class patterns might replace old ones
- Whether text labels have changed
- Structural changes to the DOM hierarchy

Return ONLY valid JSON matching this schema — no explanation, no markdown, no code fences:
{
  "changedSelectors": [{"oldSelector": "string", "newCandidate": "string or empty"}],
  "removedSelectors": ["selector1", "selector2"],
  "newTextLabels": ["new label found", "another new label"],
  "missingTextLabels": ["old label no longer found"],
  "structuralChanges": ["description of structural change"]
}
`;

export async function analyzeDOM(
  scraperName: string,
  snapshot: DOMSnapshot,
  failures: ScraperFailure[],
): Promise<DOMDiff> {
  const log = logger.child({ scraperName });
  log.info('self-healer.dom_analyzer.start');

  const scraperFailures = failures.filter(f => f.scraperName === scraperName);

  if (scraperFailures.length === 0) {
    logger.info('self-healer.dom_analyzer.no_failures');
    return {
      scraperName,
      changedSelectors: [],
      removedSelectors: [],
      newTextLabels: [],
      missingTextLabels: [],
      structuralChanges: [],
    };
  }

  const prompt = `
SCRAPER: ${scraperName}
CURRENT DOM SNAPSHOT:
- CSS Classes found: ${snapshot.cssClasses.slice(0, 50).join(', ')}
- Text labels found: ${snapshot.textLabels.join('; ')}
- Element counts: ${JSON.stringify(snapshot.elementCounts)}

FAILURES DETECTED:
${scraperFailures.map(f => `- ${f.selectorType}: "${f.selector}" (expected ${f.expectedMatches}, got ${f.actualMatches})`).join('\n')}

Source code context:
${SCRAPER_SOURCE_CONTEXT}

Analyze the changes and return the diff.
`;

  try {
    const response = await model.invoke([
      new SystemMessage(DOM_ANALYSIS_PROMPT),
      new HumanMessage(prompt),
    ]);

    const rawContent = typeof response.content === 'string' ? response.content : '';
    const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const diff = JSON.parse(cleaned) as DOMDiff;

    diff.scraperName = scraperName;

    logger.info('self-healer.dom_analyzer.complete', {
      changedCount: diff.changedSelectors.length,
      removedCount: diff.removedSelectors.length,
      structuralChangeCount: diff.structuralChanges.length,
    });

    return diff;
  } catch (error) {
    logger.error('self-healer.dom_analyzer.error', { error: String(error) });
    return {
      scraperName,
      changedSelectors: [],
      removedSelectors: [],
      newTextLabels: [],
      missingTextLabels: [],
      structuralChanges: [`Analysis failed: ${String(error)}`],
    };
  }
}
