import { NextResponse } from 'next/server';
import { withLinkedInPageForUser } from '@/lib/linkedin/browser';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const workspaceId = 'cb00516d621a641b5ac5e72cf';
    // Use the analytics summary page URL from the activity feed
    const postUrl = 'https://www.linkedin.com/analytics/post-summary/urn:li:activity:7467475889153462273/';

    const debug: Record<string, unknown> = { postUrl };

    const result = await withLinkedInPageForUser(workspaceId, async (page) => {
      await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 8000));

      debug.pageUrl = page.url();
      debug.pageTitle = await page.title();
      debug.isLoggedIn = !(debug.pageUrl as string).includes('/login');

      // Get all text that looks like analytics data
      const analyticsText = await page.evaluate(() => {
        const allText = document.body?.innerText || '';
        const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
        return {
          allLines: lines.slice(0, 50),
          bodyText: allText.slice(0, 3000),
        };
      });
      debug.analyticsText = analyticsText;

      // Get all elements with numbers that might be analytics
      const statElements = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('*'));
        return all
          .filter((el) => {
            const text = el.textContent?.trim() || '';
            return (
              el.childElementCount === 0 &&
              text.length > 0 &&
              text.length < 100 &&
              (/\d/.test(text)) &&
              (/impress|view|click|react|like|comment|share|engage|reach/i.test(text))
            );
          })
          .slice(0, 30)
          .map((el) => ({
            tag: el.tagName,
            class: (el as HTMLElement).className?.toString()?.split(' ').slice(0, 3).join(' '),
            text: el.textContent?.trim()?.slice(0, 100),
          }));
      });
      debug.statElements = statElements;

      return debug;
    });

    if (!result) {
      debug.error = 'withLinkedInPageForUser returned null';
    }

    return NextResponse.json(debug);
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
