import { prisma } from './lib/prisma';
import { scrapeLinkedInComplete } from './lib/inbox/scrapers/linkedin-scraper';

async function main() {
  console.log('Finding premium@test.com user...');
  
  const user = await prisma.user.findUnique({
    where: { email: 'premium@test.com' },
    include: {
      Workspace: {
        include: {
          ConnectedAccount: {
            where: { platform: 'linkedin' }
          }
        }
      }
    }
  });

  if (!user) {
    console.error('User premium@test.com not found');
    process.exit(1);
  }

  console.log('Found user:', user.id);

  const workspace = user.Workspace[0];
  if (!workspace) {
    console.error('No workspace found for user');
    process.exit(1);
  }

  console.log('Workspace ID:', workspace.id);

  const linkedinAccount = workspace.ConnectedAccount[0];
  if (!linkedinAccount) {
    console.error('No LinkedIn account connected for this workspace');
    process.exit(1);
  }

  console.log('LinkedIn account:', linkedinAccount.platformUsername || linkedinAccount.id);
  console.log('Has session cookie:', !!linkedinAccount.sessionCookie);

  console.log('\n=== Starting scraper for 3 months of data ===\n');

  const results = await scrapeLinkedInComplete(workspace.id);

  console.log('\n=== Results ===');
  console.log('Total posts scraped:', results.length);

  for (const result of results) {
    console.log('\n---');
    console.log('Post URN:', result.post.urn);
    console.log('Post URL:', result.post.url);
    console.log('Post text preview:', result.post.text?.substring(0, 100) || '(empty)');
    console.log('Comments:', result.comments.length);
    if (result.analytics) {
      console.log('Analytics:', {
        impressions: result.analytics.impressions,
        likes: result.analytics.likes,
        comments: result.analytics.comments,
        shares: result.analytics.shares,
      });
    } else {
      console.log('Analytics: null');
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
