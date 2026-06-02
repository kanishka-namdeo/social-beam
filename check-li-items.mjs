import { prisma } from './lib/prisma.js';

const items = await prisma.engagementItem.findMany({
  where: { platform: 'linkedin' },
  orderBy: { createdAt: 'desc' },
});

console.log('LinkedIn engagement items:', items.length);
items.forEach(i => {
  console.log(`  ID: ${i.id}`);
  console.log(`  platformItemId: ${i.platformItemId}`);
  console.log(`  authorName: ${i.authorName}`);
  console.log(`  content: ${i.content.substring(0, 80)}`);
  console.log(`  status: ${i.status}`);
  console.log(`  createdAt: ${i.createdAt}`);
  console.log('  ---');
});

await prisma.$disconnect();
