import { prisma } from './lib/prisma.js';

const items = await prisma.engagementItem.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
console.log('Items in DB:');
console.log(JSON.stringify(items.map(i => ({ id: i.id, platform: i.platform, status: i.status, author: i.authorName })), null, 2));

const accounts = await prisma.connectedAccount.findMany({ where: { status: 'connected' }, select: { platform: true } });
console.log('\nConnected accounts:', accounts);

await prisma.$disconnect();
