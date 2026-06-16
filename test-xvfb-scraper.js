/**
 * Test: Run visible browser inside Docker + Xvfb and attempt LinkedIn scraping.
 * Uses playwright-core directly to avoid module resolution issues.
 */

const { chromium } = require("playwright-core");
const fs = require("fs");

async function main() {
  console.log("=== Xvfb + Visible Browser Scraping Test ===");
  console.log(`DISPLAY=${process.env.DISPLAY}`);

  // Launch exactly as cloakbrowser service.ts does for visible browser
  const browser = await chromium.launch({
    headless: false,
    args: [
      "--window-position=-32000,-32000",
      "--window-size=1920,1080",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-gpu",
    ],
  });

  console.log("Browser launched (headless: false)");

  // Load storage state
  const storagePath = "/app/.data/linkedin-storage-state.json";
  let storageState;
  if (fs.existsSync(storagePath)) {
    const state = JSON.parse(fs.readFileSync(storagePath, "utf-8"));
    if (state.cookies && state.cookies.length > 0) {
      storageState = state;
      console.log(`Loaded storage state with ${state.cookies.length} cookies`);
    }
  }

  const contextOptions = {
    viewport: { width: 1920, height: 1080 },
    storageState: storageState ? storagePath : undefined,
  };

  const context = await browser.newContext(contextOptions);

  // Stealth injection
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });

  const page = await context.newPage();

  // Step 1: Navigate to LinkedIn feed
  console.log("\n--- Navigating to LinkedIn feed ---");
  await page.goto("https://www.linkedin.com/feed/?segmentationFilter=memberActivity", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });

  // Wait for page to stabilize (same as scraper)
  await new Promise((r) => setTimeout(r, 5000));

  const feedUrl = page.url();
  console.log(`Feed URL: ${feedUrl}`);
  console.log(`Feed title: ${await page.title()}`);

  if (feedUrl.includes("/login") || feedUrl.includes("/uas/oauth")) {
    console.log("ERROR: Redirected to login page. Cookie expired.");
    console.log("Browser rendered successfully to Xvfb though!");
    await browser.close();
    process.exit(1);
  }

  // Step 2: Try to find posts (same selectors as linkedin-scraper.ts)
  console.log("\n--- Searching for post containers ---");
  const postSelectors = [
    "div.feed-shared-update-v2",
    "article[data-view-name='update']",
    "div.update-components-container",
    "div.occludable-update",
  ];

  let foundSelector = null;
  let postCount = 0;
  for (const sel of postSelectors) {
    try {
      const count = await page.evaluate((s) => document.querySelectorAll(s).length, sel);
      if (count > 0) {
        foundSelector = sel;
        postCount = count;
        console.log(`  [FOUND] ${count} posts using: ${sel}`);
        break;
      }
    } catch {
      // skip
    }
  }

  if (!foundSelector) {
    console.log("  [NOT FOUND] No posts found with any selector");
    console.log("\nPage body text sample (first 800 chars):");
    const text = await page.evaluate(() => document.body.innerText.slice(0, 800));
    console.log(text);
  }

  // Step 3: Try to navigate to a specific post if found
  if (foundSelector) {
    console.log("\n--- Extracting post data ---");
    const posts = await page.evaluate((sel) => {
      const elements = Array.from(document.querySelectorAll(sel)).slice(0, 3);
      return elements.map((el) => {
        const link = el.querySelector("a[href*='feed/update'], a[href*='activity'], a[href*='/posts/']");
        const url = link ? link.href : null;
        const textEl = el.querySelector(
          "div.feed-shared-text, span.break-words, div.attributed-text-segment-list__content, span[class*='main-content']"
        );
        const text = textEl ? textEl.innerText?.trim() : "";
        return { url, text: text?.slice(0, 100) };
      });
    }, foundSelector);

    for (const p of posts) {
      if (p.url) {
        console.log(`  Post URL: ${p.url}`);
        console.log(`  Post text: ${p.text}`);
      }
    }

    // Step 4: Try to scrape comments from first post
    if (posts[0]?.url) {
      console.log(`\n--- Attempting to scrape comments from first post ---`);
      await page.goto(posts[0].url, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await new Promise((r) => setTimeout(r, 3000));

      const commentSelectors = [
        "div.comments-comment-item",
        "div.comment-item",
        "div.social-detail-comment",
        "li.comments-comment-item",
        "div[data-urn*='comment']",
      ];

      let commentSelector = null;
      let commentCount = 0;
      for (const sel of commentSelectors) {
        try {
          const count = await page.evaluate((s) => document.querySelectorAll(s).length, sel);
          if (count > 0) {
            commentSelector = sel;
            commentCount = count;
            console.log(`  [FOUND] ${count} comments using: ${sel}`);
            break;
          }
        } catch {}
      }

      if (commentSelector) {
        const comments = await page.evaluate((sel) => {
          const elements = Array.from(document.querySelectorAll(sel)).slice(0, 5);
          return elements.map((el) => {
            const authorLink = el.querySelector("a[href*='/in/']");
            const authorName = authorLink
              ? authorLink.innerText?.trim()
              : el.querySelector("span.feed-shared-actor__name, div.feed-shared-actor__description, span[class*='actor__name']")
                  ?.innerText?.trim() || "Unknown";
            const textEl = el.querySelector(
              "span.comments-comment-item__main-content, span[class*='main-content'], span[class*='break-words']"
            );
            const content = textEl ? textEl.innerText?.trim() : "";
            return { authorName, content: content?.slice(0, 100) };
          });
        }, commentSelector);

        console.log("\nSample comments:");
        for (const c of comments) {
          console.log(`  ${c.authorName}: ${c.content}`);
        }
      } else {
        console.log("  [NOT FOUND] No comments found");
      }
    }
  }

  console.log("\n=== Test Complete ===");
  console.log("SUCCESS: Browser rendered invisibly via Xvfb!");
  console.log("The end user sees NO browser window on their desktop.");

  await browser.close();
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  console.error(err.stack);
  process.exit(1);
});
