import { NextResponse } from 'next/server';
import { withLinkedInPageForUser } from '@/lib/linkedin/browser';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string })?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 403 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get('workspaceId') || 'cb00516d621a641b5ac5e72cf';

  // Get a post URN to test with
  const posts = await prisma.post.findMany({
    where: { workspaceId, isExternal: true },
    include: { PostPlatform: { where: { platform: 'linkedin' } } },
    take: 1,
  });

  if (posts.length === 0) {
    return NextResponse.json({ error: 'No external posts found' });
  }

  const post = posts[0];
  const platformPost = post.PostPlatform[0];
  const externalId = platformPost?.externalId;
  const activityUrn = `urn:li:activity:${externalId}`;
  const analyticsUrl = `https://www.linkedin.com/analytics/post-summary/${encodeURIComponent(activityUrn)}/`;
  const feedUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(activityUrn)}`;

  const debug: Record<string, unknown> = {
    workspaceId,
    postTitle: (post.title ?? '').slice(0, 60),
    externalId,
    analyticsUrl,
    feedUrl,
  };

  // Test 1: Scrape the analytics page
  try {
    const analyticsResult = await withLinkedInPageForUser(workspaceId, async (page) => {
      await page.goto(analyticsUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await new Promise((r) => setTimeout(r, 5000));

      debug.analyticsPageUrl = page.url();
      debug.analyticsPageTitle = await page.title();
      debug.analyticsIsLoggedIn = !page.url().includes('/login');

      // Get all text on the page
      const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 3000) || '');
      debug.analyticsBodyText = bodyText;

      // Get all visible links
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href]'))
          .slice(0, 10)
          .map(a => ({ href: a.getAttribute('href'), text: (a as HTMLElement).innerText?.slice(0, 50) }));
      });
      debug.analyticsLinks = links;

      return debug;
    });

    if (!analyticsResult) {
      debug.analyticsError = 'withLinkedInPageForUser returned null';
    }
  } catch (err) {
    debug.analyticsError = String(err);
  }

  return NextResponse.json(debug);
}
