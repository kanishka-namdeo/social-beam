import { prisma } from './lib/prisma.js';

// Find the demo user
const demoUser = await prisma.user.findUnique({
  where: { email: 'demo@socialbeam.dev' },
  include: { Workspace: true },
});

console.log('=== Demo User ===');
console.log(JSON.stringify(demoUser ? {
  id: demoUser.id,
  email: demoUser.email,
  workspaces: demoUser.Workspace?.map(w => w.id),
} : null, null, 2));

if (demoUser?.Workspace?.length > 0) {
  const wsId = demoUser.Workspace[0].id;

  // Find all LinkedIn accounts for this workspace
  const liAccounts = await prisma.connectedAccount.findMany({
    where: { platform: 'linkedin', workspaceId: wsId },
  });

  console.log('\n=== LinkedIn Accounts for Demo Workspace ===');
  console.log(JSON.stringify(liAccounts.map(a => ({
    id: a.id,
    platformUserId: a.platformUserId,
    platformUsername: a.platformUsername,
    status: a.status,
    workspaceId: a.workspaceId,
    tokenExpiry: a.tokenExpiry,
  })), null, 2));

  // Find ALL accounts for this workspace
  const allAccounts = await prisma.connectedAccount.findMany({
    where: { workspaceId: wsId },
  });
  console.log('\n=== All Accounts for Demo Workspace ===');
  console.log(JSON.stringify(allAccounts.map(a => ({
    id: a.id,
    platform: a.platform,
    platformUserId: a.platformUserId,
    platformUsername: a.platformUsername,
    status: a.status,
  })), null, 2));
}

await prisma.$disconnect();
