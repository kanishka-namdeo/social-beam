import { prisma } from './lib/prisma.js';

// Delete all test LinkedIn engagement items (IDs starting with "test-li-")
const deleted = await prisma.engagementItem.deleteMany({
  where: { platform: 'linkedin', id: { startsWith: 'test-li-' } },
});

console.log(`Deleted ${deleted.count} test LinkedIn engagement items`);

// Verify remaining items
const remaining = await prisma.engagementItem.count({ where: { platform: 'linkedin' } });
console.log(`Remaining LinkedIn items: ${remaining}`);

await prisma.$disconnect();
