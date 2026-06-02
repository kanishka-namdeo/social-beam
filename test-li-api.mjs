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
console.log('token (first 20 chars):', token.substring(0, 20) + '...');

const API_BASE = 'https://api.linkedin.com/rest';

async function apiTest(path, description) {
  console.log(`\n--- ${description} ---`);
  console.log(`GET ${path}`);
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202601',
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  console.log(`Status: ${res.status}`);
  try {
    const data = await res.json();
    if (res.ok) {
      const keys = Object.keys(data);
      console.log('Response keys:', keys);
      if (Array.isArray(data.elements)) {
        console.log('Elements count:', data.elements.length);
        if (data.elements.length > 0) {
          console.log('First element:', JSON.stringify(data.elements[0], null, 2).substring(0, 500));
        }
      } else if (Array.isArray(data)) {
        console.log('Array count:', data.length);
        if (data.length > 0) {
          console.log('First item:', JSON.stringify(data[0], null, 2).substring(0, 500));
        }
      } else {
        console.log('Response (truncated):', JSON.stringify(data).substring(0, 500));
      }
    } else {
      console.log('Error:', JSON.stringify(data).substring(0, 500));
    }
  } catch (e) {
    console.log('Parse error:', e.message);
  }
}

// Test 1: Get user profile
await apiTest('/me', 'User Profile');

// Test 2: Get posts (personal) - REST API
await apiTest('/posts?q=author&author=urn%3Ali%3Aperson%3A' + personId, 'Personal Posts (REST)');

// Test 3: Get posts via v2 UGC endpoint
const v2Base = 'https://api.linkedin.com/v2';
console.log('\n--- Personal UGC Posts (v2) ---');
const ugcRes = await fetch(`${v2Base}/ugcPosts?q=authors&authors=List(urn%3Ali%3Aperson%3A${personId})&count=5`, {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('Status:', ugcRes.status);
try {
  const ugcData = await ugcRes.json();
  if (ugcRes.ok) {
    console.log('Elements:', ugcData.elements?.length ?? 0);
    if (ugcData.elements?.length > 0) {
      console.log('First:', JSON.stringify(ugcData.elements[0], null, 2).substring(0, 500));
    }
  } else {
    console.log('Error:', JSON.stringify(ugcData).substring(0, 500));
  }
} catch (e) { console.log('Parse error:', e.message); }

// Test 4: Get organizational shares
await apiTest('/organizationalEntityShares?q=organizations&organization=urn%3Ali%3Aorganization%3A' + personId, 'Organizational Shares');

// Test 5: Get shares (personal)
await apiTest('/shares?q=authors&authors=List(urn%3Ali%3Aperson%3A' + personId + ')&count=5', 'Personal Shares');

// Test 6: Try to get organizations
await apiTest('/organizations?q=search&start=0&count=5', 'Organizations Search');

// Test 7: Try socialActions on a generic URN
await apiTest('/socialActions/urn%3Ali%3Ashare%3A123/comments?count=1', 'Social Actions (test URN)');

// Test 8: Shares by owner (org format)
await apiTest('/shares?q=owners&owners=urn%3Ali%3Aorganization%3A' + personId + '&count=5', 'Shares by Owner');

console.log('\n=== Done ===');

await prisma.$disconnect();
