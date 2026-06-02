import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import { encryptToken } from './lib/oauth/crypto.js';
import { randomUUID } from 'crypto';

// Get the demo user workspace
const demoUser = await prisma.user.findUnique({
  where: { email: 'demo@socialbeam.dev' },
  include: { Workspace: true },
});

const wsId = demoUser?.Workspace?.[0]?.id;
if (!wsId) { console.log('No workspace found'); process.exit(1); }

// Read the extracted li_at cookie
import { existsSync, readFileSync } from 'fs';
const cookieFile = './.data/linkedin-li-at-cookie.txt';
if (!existsSync(cookieFile)) {
  console.log('No li_at cookie found. Run: npx tsx scripts/extract-linkedin-cookie.mjs');
  process.exit(1);
}

const liAtCookie = readFileSync(cookieFile, 'utf-8').trim();

// Create a dummy encrypted token (the scraper will use the cookie, but the adapter needs a token)
const dummyToken = encryptToken(liAtCookie);

// Check if LinkedIn account already exists
const existing = await prisma.connectedAccount.findUnique({
  where: { workspaceId_platform: { workspaceId: wsId, platform: 'linkedin' } },
});

if (existing) {
  console.log('LinkedIn account already exists, updating...');
  await prisma.connectedAccount.update({
    where: { id: existing.id },
    data: {
      status: 'connected',
      accessToken: dummyToken,
      platformUserId: 'FHrQRCuLY7',
      platformUsername: 'Kanishka Vardhan Namdeo',
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      refreshToken: '',
    },
  });
  console.log('LinkedIn account updated');
} else {
  await prisma.connectedAccount.create({
    data: {
      id: randomUUID(),
      workspaceId: wsId,
      platform: 'linkedin',
      platformUserId: 'FHrQRCuLY7',
      platformUsername: 'Kanishka Vardhan Namdeo',
      accessToken: dummyToken,
      refreshToken: '',
      status: 'connected',
      tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });
  console.log('LinkedIn account created');
}

// Verify
const account = await prisma.connectedAccount.findUnique({
  where: { workspaceId_platform: { workspaceId: wsId, platform: 'linkedin' } },
});
console.log('Account status:', account?.status);
console.log('Token expiry:', account?.tokenExpiry);
console.log('Platform user ID:', account?.platformUserId);

await prisma.$disconnect();
