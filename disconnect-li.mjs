import { prisma } from './lib/prisma.js';

// Disconnect existing LinkedIn accounts for the demo workspace so we can reconnect with proper scopes
const demoUser = await prisma.user.findUnique({
  where: { email: 'demo@socialbeam.dev' },
  include: { Workspace: true },
});

const wsId = demoUser?.Workspace?.[0]?.id;
if (!wsId) { console.log('No workspace found'); process.exit(1); }

const deleted = await prisma.connectedAccount.deleteMany({
  where: { workspaceId: wsId, platform: 'linkedin' },
});

console.log(`Deleted ${deleted.count} LinkedIn account(s) from workspace ${wsId}`);

await prisma.$disconnect();
