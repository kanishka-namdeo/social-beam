import { createDecipheriv } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config({ path: '.env' });

const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.error('TOKEN_ENCRYPTION_KEY not set');
  process.exit(1);
}
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');

function decryptToken(encrypted) {
  const data = Buffer.from(encrypted, 'base64');
  const iv = data.subarray(0, 16);
  const authTag = data.subarray(16, 32);
  const ciphertext = data.subarray(32);
  const decipher = createDecipheriv('aes-256-gcm', KEY_BUFFER, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: 'premium@test.com' },
  include: { Workspace: { include: { ConnectedAccount: { where: { platform: 'linkedin' } } } } },
});

if (!user || !user.Workspace || user.Workspace.length === 0) {
  console.log('No workspace found for premium@test.com');
  await prisma.$disconnect();
  process.exit(0);
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
      console.log('Decrypt failed:', e.message);
    }
  }
}

await prisma.$disconnect();
