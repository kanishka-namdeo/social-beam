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

const liAccount = await prisma.connectedAccount.findUnique({
  where: { workspaceId_platform: { workspaceId: wsId, platform: 'linkedin' } },
});

if (!liAccount) { console.log('No LinkedIn account found'); process.exit(1); }

const token = decryptToken(liAccount.accessToken);
const personId = liAccount.platformUserId;

console.log('=== Token Info ===');
console.log('platformUserId:', personId);

// Test v2/me with correct version header
const restBase = 'https://api.linkedin.com/rest';
const v2Base = 'https://api.linkedin.com/v2';

async function test(method, url, description, extraHeaders = {}) {
  console.log(`\n--- ${description} ---`);
  console.log(`${method} ${url}`);
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
      ...extraHeaders,
    },
  });
  console.log(`Status: ${res.status}`);
  try {
    const data = await res.json();
    if (res.ok) {
      console.log('Response:', JSON.stringify(data).substring(0, 800));
    } else {
      console.log('Error:', JSON.stringify(data).substring(0, 800));
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

// Test 1: REST /me (identity)
await test('GET', `${restBase}/me`, 'REST /me');

// Test 2: v2/me (legacy)
await test('GET', `${v2Base}/me`, 'v2/me');

// Test 3: v2/userinfo (OpenID)
await test('GET', `${v2Base}/userinfo`, 'v2/userinfo (OIDC)');

// Test 4: Posts (REST) - personal
await test('GET', `${restBase}/posts?q=author&author=urn%3Ali%3Aperson%3A${personId}`, 'Personal Posts');

// Test 5: Shares (REST)
await test('GET', `${restBase}/shares?q=authors&authors=List(urn%3Ali%3Aperson%3A${personId})`, 'Personal Shares');

// Test 6: Organizations the user can access
await test('GET', `${restBase}/organizationalEntityAcls`, 'Organizational Entity ACLs');

// Test 7: Organizations search
await test('GET', `${restBase}/organizations?q=search&start=0&count=10`, 'Organizations Search');

// Test 8: Try without LinkedIn-Version header (some older APIs)
console.log('\n--- Posts without version header ---');
const noVerRes = await fetch(`${restBase}/posts?q=author&author=urn%3Ali%3Aperson%3A${personId}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    'X-Restli-Protocol-Version': '2.0.0',
  },
});
console.log('Status:', noVerRes.status);
try {
  const data = await noVerRes.json();
  console.log('Response:', JSON.stringify(data).substring(0, 500));
} catch (e) { console.log('Parse error:', e.message); }

console.log('\n=== Done ===');
await prisma.$disconnect();
