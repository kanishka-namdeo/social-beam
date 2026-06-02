import { PrismaClient } from '../app/generated/prisma/client.js';

const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.connectedAccount.findMany({
    where: { platform: 'linkedin', status: 'connected' },
    select: { id: true, platformUserId: true, sourcePlatform: true, workspaceId: true }
  });
  console.log(JSON.stringify(accounts, null, 2));
  await prisma.$disconnect();
}

main().catch(console.error);
