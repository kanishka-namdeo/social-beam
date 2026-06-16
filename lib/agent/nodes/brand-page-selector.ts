import { ChatOpenAI } from '@langchain/openai';
import { type BrandAnalyzerStateType } from '../state';
import { createLogger } from '../logging';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const MAX_SELECTED_PAGES = 5;
const SKIP_LLM_THRESHOLD = 5; // If <=5 unique pages, skip LLM call

const PAGE_SELECTOR_SYSTEM_PROMPT = `You are a brand context curator. Given a list of website pages with their content summaries, rank them by how relevant they are for building a comprehensive brand identity profile (business name, tone, voice, audience, products, values, mission).

Pages about "about", "mission", "team", "products", "features", "values", and homepage content are typically most relevant. Blog posts, terms of service, and legal pages are typically least relevant.

Return ONLY valid JSON:
{ "rankedPages": ["path1", "path2", ...], "reasons": { "path1": "reason" } }`;

function buildPageSummaries(
  crawledContent: Record<string, { page: string; zone: string; weight: number; text: string }>,
): { path: string; hero: string; headings: string; body: string }[] {
  const pageEntries = Object.entries(crawledContent);

  // Group by page path
  const pageMap = new Map<string, { zones: typeof pageEntries }>();
  for (const entry of pageEntries) {
    const page = entry[1].page;
    if (!pageMap.has(page)) {
      pageMap.set(page, { zones: [] });
    }
    pageMap.get(page)!.zones.push(entry);
  }

  const summaries: { path: string; hero: string; headings: string; body: string }[] = [];
  for (const [path, { zones }] of pageMap) {
    const heroZone = zones.find(([, z]) => z.zone === 'hero');
    const headingZone = zones.find(([, z]) => z.zone === 'heading');
    const bodyZones = zones.filter(([, z]) => z.zone === 'body');

    const hero = heroZone ? heroZone[1].text.slice(0, 200) : '';
    const headings = headingZone ? headingZone[1].text.slice(0, 200) : '';
    const body = bodyZones.map(([, z]) => z.text).join(' ').slice(0, 300);

    summaries.push({ path, hero, headings, body });
  }

  return summaries;
}

function filterCrawledContent(
  crawledContent: Record<string, { page: string; zone: string; weight: number; text: string }>,
  selectedPages: string[],
): Record<string, { page: string; zone: string; weight: number; text: string }> {
  const selectedSet = new Set(selectedPages);
  const filtered: Record<string, { page: string; zone: string; weight: number; text: string }> = {};

  for (const [key, entry] of Object.entries(crawledContent)) {
    if (selectedSet.has(entry.page)) {
      filtered[key] = entry;
    }
  }

  return filtered;
}

export async function brandPageSelectorNode(state: BrandAnalyzerStateType): Promise<Partial<BrandAnalyzerStateType>> {
  const log = createLogger({ correlationId: state.correlationId ?? 'unknown', userId: state.userId ?? 'unknown' });

  const entries = Object.entries(state.crawledContent);
  const uniquePages = [...new Set(entries.map(([, e]) => e.page))];
  const totalCount = uniquePages.length;

  log.info('brandPageSelectorNode: entering', { totalPages: totalCount });

  // Skip LLM call if too few pages to filter
  if (totalCount <= SKIP_LLM_THRESHOLD) {
    log.info('brandPageSelectorNode: skipping LLM call — too few pages to filter', { totalPages: totalCount });
    return {
      crawledContent: state.crawledContent,
      __selectedPages: uniquePages,
      __totalPagesBefore: totalCount,
    };
  }

  const summaries = buildPageSummaries(state.crawledContent);

  const userPrompt = `Rank these ${summaries.length} pages by brand relevance for building a brand identity profile:\n\n${summaries.map((s, i) => {
    return `Page ${i + 1}: ${s.path}${s.hero ? `\n  Hero: ${s.hero}` : ''}${s.headings ? `\n  Headings: ${s.headings}` : ''}${s.body ? `\n  Body: ${s.body}` : ''}`;
  }).join('\n\n')}`;

  try {
    const model = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? process.env.API_KEY,
      configuration: process.env.BASE_URL ? { baseURL: process.env.BASE_URL } : undefined,
      modelName: process.env.FAST_MODEL ?? process.env.MODEL ?? 'qwen3.6-plus',
      temperature: 0.1,
      maxRetries: 2,
      timeout: 90_000,
    });

    const response = await model.invoke([
      new HumanMessage({ content: PAGE_SELECTOR_SYSTEM_PROMPT }),
      new HumanMessage({ content: userPrompt }),
    ]);

    const rawContent = typeof response.content === 'string' ? response.content : '';
    const cleaned = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(cleaned) as { rankedPages: string[]; reasons: Record<string, string> };

    if (!Array.isArray(parsed.rankedPages) || parsed.rankedPages.length === 0) {
      throw new Error('LLM returned empty or invalid rankedPages');
    }

    const selectedPages = parsed.rankedPages.slice(0, MAX_SELECTED_PAGES);
    const filteredContent = filterCrawledContent(state.crawledContent, selectedPages);

    log.info('brandPageSelectorNode: selection complete', {
      totalPages: totalCount,
      selectedPages: selectedPages.length,
      filteredEntries: Object.keys(filteredContent).length,
    });

    return {
      crawledContent: filteredContent,
      __selectedPages: selectedPages,
      __totalPagesBefore: totalCount,
    };
  } catch (err) {
    // Graceful degradation: pass through all content unchanged
    log.warn('brandPageSelectorNode: LLM call or parsing failed — passing through all content', { error: String(err) });
    return {
      crawledContent: state.crawledContent,
      __selectedPages: uniquePages,
      __totalPagesBefore: totalCount,
      messages: [new AIMessage(`Page selection encountered an issue: ${String(err)}. All pages will be analyzed.`)],
    };
  }
}