import { prisma } from './lib/prisma';
import { decryptToken } from './lib/oauth/crypto';

const LI_BASE = 'https://api.linkedin.com/rest';

async function liGet(path: string, token: string) {
  const url = `${LI_BASE}${path}`;
  console.log(`\nGET ${url.split('?')[0]}`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202601',
    },
  });
  const data = await res.json().catch(() => ({ error: 'failed to parse' }));
  console.log(`  Status: ${res.status}`);
  if (!res.ok) {
    console.log(`  Error: ${JSON.stringify(data).substring(0, 500)}`);
  } else {
    console.log(`  Response: ${JSON.stringify(data).substring(0, 500)}`);
  }
  return { status: res.status, data };
}

async function liPost(path: string, body: any, token: string) {
  const url = `${LI_BASE}${path}`;
  console.log(`\nPOST ${url}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': '202601',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: 'failed to parse' }));
  console.log(`  Status: ${res.status}`);
  if (!res.ok) {
    console.log(`  Error: ${JSON.stringify(data).substring(0, 500)}`);
  } else {
    console.log(`  Response: ${JSON.stringify(data).substring(0, 500)}`);
  }
  return { status: res.status, data };
}

async function main() {
  console.log('=== LinkedIn API Testing ===\n');

  // Get the real account
  const accounts = await prisma.connectedAccount.findMany({
    where: { platform: 'linkedin' },
  });

  let realToken: string | null = null;
  let platformUserId: string | null = null;

  for (const account of accounts) {
    if (account.accessToken && account.platformUserId !== 'test_li_user') {
      try {
        realToken = decryptToken(account.accessToken);
        platformUserId = account.platformUserId;
        console.log('Using account:', account.platformUserId);
        console.log('Workspace ID:', account.workspaceId);
        break;
      } catch {
        console.log('Skipping account with undecryptable token:', account.id);
      }
    }
  }

  if (!realToken) {
    console.log('No valid token found!');
    await prisma.$disconnect();
    return;
  }

  console.log('\n=== 1. GET /me (current user info) ===');
  const meResult = await liGet('/me', realToken);

  // Determine URN type
  let urnType = 'unknown';
  let urnValue = '';

  if (meResult.status === 200 && meResult.data) {
    const d = meResult.data;
    if (d.id) {
      urnValue = `urn:li:person:${d.id}`;
      urnType = 'person';
    }
  }

  // Also try the platformUserId from DB
  console.log(`\n=== URN Analysis ===`);
  console.log('Platform User ID from DB:', platformUserId);
  console.log('Determined URN type:', urnType);
  console.log('Determined URN:', urnValue);

  // Check if the URN might be an organization
  console.log('\n=== 2. Check if person URN works ===');
  if (urnValue) {
    await liGet(`/shares?q=authors&authors=${encodeURIComponent(urnValue)}&count=5`, realToken);
  }

  // Try organization URN based on platformUserId
  console.log('\n=== 3. Try organization shares endpoint ===');
  await liGet(`/organizationalEntityShares?q=organizations&organization=urn%3Ali%3Aorganization%3A${platformUserId}&count=5`, realToken);

  // Try shares for person URN
  console.log('\n=== 4. Try shares for person URN ===');
  await liGet(`/shares?q=authors&authors=${encodeURIComponent(urnValue)}&count=10`, realToken);

  // Try looking up the organizational entity
  console.log('\n=== 5. Try organizational entity lookup ===');
  await liGet(`/organizationalEntities/${encodeURIComponent(`urn:li:organization:${platformUserId}`)}`, realToken);

  // Try socialActions for likes
  console.log('\n=== 6. Try socialActions (likes) ===');
  // We need a share URN first, but let's try a generic query
  await liGet(`/socialActions/urn%3Alishare%3A7344424462678188032?count=5`, realToken);

  // Try getting comments on a share (need share URN)
  console.log('\n=== 7. Try comments endpoint ===');
  // Let's try with a share URN we might find
  const sharesResult = await liGet(`/shares?q=authors&authors=${encodeURIComponent(urnValue)}&count=20`, realToken);
  if (sharesResult.status === 200 && sharesResult.data?.elements?.length > 0) {
    console.log(`\nFound ${sharesResult.data.elements.length} shares`);
    for (const share of sharesResult.data.elements) {
      const shareUrn = share.share || share.id;
      if (shareUrn) {
        console.log(`\n  Fetching comments for share: ${shareUrn}`);
        await liGet(`/socialActions/${encodeURIComponent(shareUrn)}/comments?count=10`, realToken);
      }
    }
  }

  // Try the UGC posts endpoint
  console.log('\n=== 8. Try UGC posts endpoint ===');
  await liGet(`/ugcPosts?q=authors&authors=${encodeURIComponent(urnValue)}&count=10`, realToken);

  // Try engagement stats
  console.log('\n=== 9. Try likes on share ===');
  await liGet(`/socialActions/urn:li:share:7344424462678188032?count=5`, realToken);

  // Try searching for brand accounts
  console.log('\n=== 10. Try brand accounts ===');
  if (urnType === 'person') {
    await liGet(`/brandEntities?q=person&person=${encodeURIComponent(urnValue)}`, realToken);
  }

  await prisma.$disconnect();
  console.log('\n=== DONE ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
