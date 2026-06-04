import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { logger } from "@/lib/logger";

const WebSearchSchema = z.object({
  query: z.string().describe("The search query to look up"),
  maxResults: z.number().optional().default(5).describe("Number of results to return (default: 5)"),
});

export const webSearchTool = tool(
  async (input: unknown) => {
    const { query, maxResults } = WebSearchSchema.parse(input);
    const log = logger.child({ tool: "web_search", query });

    log.debug("tool.web_search.invoke");

    try {
      const results = await searchDuckDuckGo(query, maxResults);

      log.info("tool.web_search.success", { resultCount: results.length });

      return JSON.stringify({
        query,
        results,
        count: results.length,
      });
    } catch (error) {
      log.error("tool.web_search.error", { error: String(error) });
      return JSON.stringify({
        error: `Search failed: ${String(error)}`,
        results: [],
        count: 0,
      });
    }
  },
  {
    name: "web_search",
    description: "Search the web for current information. Use to find up-to-date documentation, API references, best practices, or answers to technical questions. Returns titles, snippets, and URLs.",
    schema: WebSearchSchema,
  },
);

async function searchDuckDuckGo(query: string, maxResults: number) {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(searchUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
  }

  const html = await response.text();
  return parseResults(html, maxResults);
}

function parseResults(html: string, maxResults: number) {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  const titleRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

  const titles: Array<{ title: string; url: string }> = [];
  let match;
  while ((match = titleRegex.exec(html)) !== null) {
    const rawUrl = match[1];
    if (rawUrl.includes("duckduckgo.com/l/")) continue;
    const title = match[2].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
    if (title) {
      const decodedUrl = decodeURIComponent(rawUrl.replace(/^https?:\/\/duckduckgo\.com\/l\/\?uddg=/, "").replace(/&rut=.*/, ""));
      titles.push({ title, url: decodedUrl.startsWith("http") ? decodedUrl : `https://${decodedUrl}` });
    }
  }

  const snippets: string[] = [];
  let snippetMatch;
  while ((snippetMatch = snippetRegex.exec(html)) !== null) {
    const text = snippetMatch[1].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
    if (text) {
      snippets.push(text);
    }
  }

  for (let i = 0; i < Math.min(titles.length, snippets.length, maxResults); i++) {
    results.push({
      title: titles[i].title,
      url: titles[i].url,
      snippet: snippets[i],
    });
  }

  return results;
}
