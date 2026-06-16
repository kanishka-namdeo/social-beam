const { prisma } = require("./lib/prisma");

async function main() {
  const accounts = await prisma.connectedAccount.findMany({
    where: { platform: "linkedin" },
    select: {
      id: true,
      workspaceId: true,
      platformUsername: true,
      status: true,
      cookieExpiry: true,
      lastRefreshAt: true,
      lastSyncedAt: true,
    },
  });
  console.log(JSON.stringify(accounts, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
