import { PrismaClient } from '../app/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const account = await prisma.connectedAccount.findFirst({
    where: {
      platform: 'linkedin',
      NOT: {
        platformUserId: 'brewbean_li'
      }
    }
  });

  if (account) {
    console.log('Found LinkedIn account: id=' + account.id + ', workspaceId=' + account.workspaceId + ', platformUserId=' + account.platformUserId);
    const fs = await import('fs');
    fs.writeFileSync('scripts/temp-workspace-id.txt', account.workspaceId);
  } else {
    console.error('No LinkedIn account found (excluding brewbean_li)');
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
