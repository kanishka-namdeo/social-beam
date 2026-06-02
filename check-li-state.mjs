import 'dotenv/config';
import { prisma } from './lib/prisma.js';

// Check current state of LinkedIn in the demo workspace
const demoUser = await prisma.user.findUnique({
  where: { email: 'demo@socialbeam.dev' },
  include: { Workspace: true },
});

const wsId = demoUser?.Workspace?.[0]?.id;
console.log('Demo workspace ID:', wsId);

// Check if any LinkedIn accounts exist
const liAccounts = await prisma.connectedAccount.findMany({
  where: { workspaceId: wsId, platform: 'linkedin' },
});
console.log('LinkedIn accounts in workspace:', liAccounts.length);

// Check engagement items
const engagementCount = await prisma.engagementItem.count({
  where: { workspaceId: wsId },
});
console.log('Engagement items in workspace:', engagementCount);

// Show what scopes are configured in the platform registry
import { getPlatform } from './lib/oauth/platform-registry.js';
const liConfig = getPlatform('linkedin');
console.log('\n=== LinkedIn OAuth Configuration ===');
console.log('Configured scopes:', liConfig?.scopes);
console.log('Auth URL:', liConfig?.authUrl);

await prisma.$disconnect();
