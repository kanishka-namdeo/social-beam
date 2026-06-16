import { prisma } from "./lib/prisma";
const accounts = await prisma.connectedAccount.findMany({
  select: { id: true, workspaceId: true, platform: true, platformUserId: true, status: true, sessionCookie: true, cookieExpiry: true }
});
console.log(JSON.stringify(accounts, null, 2));
await prisma.$disconnect();
