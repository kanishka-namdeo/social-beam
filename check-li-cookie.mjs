import { prisma } from './lib/prisma.js';

const user = await prisma.user.findUnique({
  where: { email: 'premium@test.com' },
  include: { Workspace: { include: { ConnectedAccount: { where: { platform: 'linkedin' } } } } },
});

if (user && user.Workspace && user.Workspace.length > 0) {
  const ca = user.Workspace[0].ConnectedAccount;
  console.log('Workspace:', user.Workspace[0].id);
  console.log('LinkedIn accounts:', JSON.stringify(ca.map(a => ({
    status: a.status,
    hasSessionCookie: !!a.sessionCookie,
    cookieExpiry: a.cookieExpiry,
  })), null, 2));
} else {
  console.log('No workspace found');
}

await prisma.$disconnect();
