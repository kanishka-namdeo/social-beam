import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { launch } from "cloakbrowser";
import { logger } from "@/lib/logger";

const WebFetchSchema = z.object({
  url: z.string().describe("The full URL to fetch content from. Include protocol (https://)"),
  maxChars: z.number().optional().default(12000).describe("Maximum characters of text content to return (default: 12000)"),
  waitForMs: z.number().optional().default(3000).describe("How long to wait after page load for dynamic content (ms, default: 3000)"),
});

export const webFetchTool = tool(
  async (input: unknown) => {
    // Validate input BEFORE launching browser to prevent resource leak on invalid input
    const { url, maxChars, waitForMs } = WebFetchSchema.parse(input);
    const log = logger.child({ tool: "web_fetch", url });

    log.debug("tool.web_fetch.invoke");

    const browser = await launch({ headless: true });

    try {
      const page = await browser.newPage();

      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 25_000,
      });

      // Wait for dynamic content to render
      await page.waitForTimeout(waitForMs);

      // Extract all visible text content
      const textContent = await page.evaluate(() => {
        // Remove non-content elements
        const selectorsToRemove = [
          "script", "style", "noscript", "iframe", "nav",
          "footer", "header", "[role='banner']", "[role='navigation']",
          "[role='complementary']", ".cookie-banner", "#cookie-banner",
          ".cookie-consent", "[class*='cookie']", "[class*='banner']",
          "[class*='nav']", "[class*='menu']", "[class*='footer']",
        ];
        selectorsToRemove.forEach((sel) => {
          document.querySelectorAll(sel).forEach((el) => el.remove());
        });

        return document.body?.innerText || document.body?.textContent || "";
      });

      const cleaned = textContent
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0)
        .join("\n");

      const content = cleaned.slice(0, maxChars);

      log.info("tool.web_fetch.success", {
        url,
        charsReturned: content.length,
        totalChars: cleaned.length,
      });

      return JSON.stringify({
        url,
        content,
        chars: content.length,
        truncated: cleaned.length > maxChars,
      });
    } catch (error) {
      log.error("tool.web_fetch.error", { url, error: String(error) });
      return JSON.stringify({
        url,
        error: `Fetch failed: ${String(error)}`,
        content: "",
      });
    } finally {
      await browser.close();
    }
  },
  {
    name: "web_fetch",
    description: "Fetch and extract text content from any URL using a full browser with JS rendering. Handles SPAs, dynamic content, and complex pages. Use after web_search to read the full content of a page — documentation, blog posts, API references, or any web page.",
    schema: WebFetchSchema,
  },
);
