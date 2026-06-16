/**
 * Test script: Trigger scrapeLinkedInComplete for premium@test.com
 * Run: node test-linkedin-complete.mjs
 */
import { PrismaClient } from './app/generated/prisma/index.js';
import { scrapeLinkedInComplete } from './lib/inbox/scrapers/linkedin-scraper.ts';

const prisma = new PrismaClient();

async function main() {
  // Find the user premium@test.com
  const user = await prisma.user.findUnique({
    where: { email: 'premium@test.com' },
    include: {
      Workspaces: {
        include: {
          ConnectedAccount: {
            where: { platform: 'linkedin' },
          },
        },
      },
    },
  });

  if (!user) {
    console.error('User premium@test.com not found');
    process.exit(1);
  }

  console.log('Found user:', user.email, 'ID:', user.id);

  // Find workspace with LinkedIn connected
  const workspace = user.Workspaces.find(w =>
    w.ConnectedAccount.some(a => a.platform === 'linkedin' && a.status === 'connected')
  );

  if (!workspace) {
    console.error('No workspace with connected LinkedIn account found for premium@test.com');
    process.exit(1);
  }

  const linkedinAccount = workspace.ConnectedAccount.find(a => a.platform === 'linkedin');
  console.log('Workspace ID:', workspace.id);
  console.log('LinkedIn account:', linkedinAccount?.platformUsername || linkedinAccount?.id);
  console.log('Has session cookie:', !!linkedinAccount?.sessionCookie);

  // Trigger the scraper
  console.log('\n--- Starting scrapeLinkedInComplete ---\n');

  const results = await scrapeLinkedInComplete(workspace.id);

  console.log('\n--- Results ---');
  console.log('Posts scraped:', results.length);

  for (const r of results) {
    console.log('\nPost:', r.post.urn);
    console.log('  URL:', r.post.url);
    console.log('  Text:', r.post.text?.substring(0, 80) || '(empty)');
    console.log('  Comments:', r.comments.length);
    console.log('  Analytics:', r.analytics ? {
      impressions: r.analytics.impressions,
      likes: r.analytics.likes,
      comments: r.analytics.comments,
      shares: r.analytics.shares,
    } : 'null');
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
