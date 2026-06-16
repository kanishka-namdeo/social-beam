import { config } from 'dotenv';
config({ path: '.env' });

import { prisma } from './lib/prisma';
import { decryptToken } from './lib/oauth/crypto';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'premium@test.com' },
    include: { Workspace: { include: { ConnectedAccount: { where: { platform: 'linkedin' } } } } },
  });

  if (!user || !user.Workspace || user.Workspace.length === 0) {
    console.log('No workspace found for premium@test.com');
    return;
  }

  const ws = user.Workspace[0];
  console.log('Workspace ID:', ws.id);
  console.log('LinkedIn accounts:', ws.ConnectedAccount.length);

  for (const ca of ws.ConnectedAccount) {
    console.log('---');
    console.log('ID:', ca.id);
    console.log('Status:', ca.status);
    console.log('Has sessionCookie:', !!ca.sessionCookie);
    console.log('Cookie expiry:', ca.cookieExpiry);
    if (ca.sessionCookie) {
      try {
        const decrypted = decryptToken(ca.sessionCookie);
        console.log('DECRYPTED_COOKIE:', decrypted);
      } catch (e) {
        console.log('Decrypt failed:', (e as Error).message);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
