import 'dotenv/config';
import { prisma } from './lib/prisma.js';
import { decryptToken } from './lib/oauth/crypto.js';

// Get the demo user workspace
const demoUser = await prisma.user.findUnique({
  where: { email: 'demo@socialbeam.dev' },
  include: { Workspace: true },
});

const wsId = demoUser?.Workspace?.[0]?.id;
if (!wsId) { console.log('No workspace found'); process.exit(1); }

// Get LinkedIn account
const liAccount = await prisma.connectedAccount.findUnique({
  where: { workspaceId_platform: { workspaceId: wsId, platform: 'linkedin' } },
});

if (!liAccount) { console.log('No LinkedIn account found'); process.exit(1); }

const token = decryptToken(liAccount.accessToken);
const personId = liAccount.platformUserId;

console.log('=== LinkedIn Account ===');
console.log('platformUserId:', personId);
console.log('username:', liAccount.platformUsername);

// Check what scopes the current token actually has by using the introspection endpoint
// or by checking the token's scope field if available
const v2Base = 'https://api.linkedin.com/v2';
const restBase = 'https://api.linkedin.com/rest';

// Try to get the current user's info with different approaches
async function testEndpoint(url, desc) {
  console.log(`\n--- ${desc} ---`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  console.log(`Status: ${res.status}`);
  const headers = [...res.headers.entries()];
  const xliScopes = headers.find(h => h[0].includes('x-linkedin') || h[0].includes('x-li'));
  if (xliScopes) console.log('LinkedIn header:', xliScopes);
  try {
    const data = await res.json();
    if (res.ok) {
      console.log('OK - keys:', Object.keys(data));
      if (data.scope) console.log('Scopes:', data.scope);
      console.log('Data:', JSON.stringify(data).substring(0, 500));
    } else {
      console.log('Error:', JSON.stringify(data).substring(0, 500));
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

// Check token introspection
await testEndpoint(`${v2Base}/introspectToken`, 'Token Introspection');

// Try /me with different content types
await testEndpoint(`${restBase}/me`, 'REST /me');

// Try the posts API for organization (r_organization_social)
await testEndpoint(`${restBase}/posts?q=author&author=urn:li:organization:${personId}`, 'Organization Posts');

// Try personal posts (r_member_social)
await testEndpoint(`${restBase}/posts?q=author&author=urn:li:person:${personId}`, 'Personal Posts');

console.log('\n=== Done ===');
await prisma.$disconnect();
