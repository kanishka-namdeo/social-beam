import 'dotenv/config';
import { prisma } from './lib/prisma.js';

// Get the demo user workspace
const demoUser = await prisma.user.findUnique({
  where: { email: 'demo@socialbeam.dev' },
  include: { Workspace: true },
});

const wsId = demoUser?.Workspace?.[0]?.id;
if (!wsId) { console.log('No workspace found'); process.exit(1); }

console.log('Workspace:', wsId);
console.log('Triggering LinkedIn inbox sync...');

// Import the sync function
import { syncEngagement } from './lib/inbox/fetchers/sync-engagement.js';

const result = await syncEngagement(wsId);
console.log('\nSync result:', JSON.stringify(result, null, 2));

// Check LinkedIn items after sync
const liItems = await prisma.engagementItem.findMany({
  where: { platform: 'linkedin' },
  orderBy: { createdAt: 'desc' },
  take: 20,
});

console.log(`\nLinkedIn items after sync: ${liItems.length}`);
for (const item of liItems) {
  console.log(`  - ${item.authorName}: ${item.content.substring(0, 60)}`);
}

await prisma.$disconnect();
