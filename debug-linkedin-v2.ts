import { prisma } from './lib/prisma';
import { decryptToken } from './lib/oauth/crypto';

const LI_BASE = 'https://api.linkedin.com/rest';
const LI_V2 = 'https://api.linkedin.com/v2';

async function liGet(path: string, token: string, baseUrl: string = LI_BASE, version: string = '202601') {
  const url = `${baseUrl}${path}`;
  console.log(`\nGET ${url.split('?')[0]}`);
  console.log(`  LinkedIn-Version: ${version}`);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': version,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  const data = await res.json().catch(() => ({ error: 'failed to parse' }));
  console.log(`  Status: ${res.status}`);
  if (!res.ok) {
    console.log(`  Error: ${JSON.stringify(data).substring(0, 500)}`);
  } else {
    const str = JSON.stringify(data);
    console.log(`  Response (${str.length} chars): ${str.substring(0, 500)}`);
  }
  return { status: res.status, data };
}

async function main() {
  console.log('=== LinkedIn API Deep Debug ===\n');

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

  // Test 1: Try /v2/me (consumer endpoint, no version header)
  console.log('\n=== TEST 1: GET /v2/me (consumer endpoint) ===');
  const v2Me = await fetch(`${LI_V2}/me`, {
    headers: {
      Authorization: `Bearer ${realToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  const v2MeData = await v2Me.json();
  console.log(`  Status: ${v2Me.status}`);
  console.log(`  Response: ${JSON.stringify(v2MeData).substring(0, 500)}`);

  // Test 2: Try /v2/userinfo (OpenID Connect)
  console.log('\n=== TEST 2: GET /v2/userinfo (OpenID) ===');
  const v2UserInfo = await fetch(`${LI_V2}/userinfo`, {
    headers: {
      Authorization: `Bearer ${realToken}`,
    },
  });
  const v2UserInfoData = await v2UserInfo.json();
  console.log(`  Status: ${v2UserInfo.status}`);
  console.log(`  Response: ${JSON.stringify(v2UserInfoData).substring(0, 500)}`);

  // Test 3: Try different LinkedIn-Version formats for /rest/posts
  console.log('\n=== TEST 3: Test version formats ===');
  const versions = ['202510', '202511', '202512', '202601', '202602', '202603', '202604', '202605'];
  for (const v of versions) {
    const res = await fetch(`${LI_BASE}/posts?q=author&author=urn%3Ali%3Aperson%3A${platformUserId}&count=1`, {
      headers: {
        Authorization: `Bearer ${realToken}`,
        'LinkedIn-Version': v,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });
    const data = await res.json().catch(() => ({}));
    console.log(`  Version ${v}: status=${res.status}, error=${data.message || data.code || 'N/A'}`);
  }

  // Test 4: Try with the correct person URN if we got it from /v2/me
  let personUrn = `urn:li:person:${platformUserId}`;
  if (v2Me.status === 200 && v2MeData.id) {
    personUrn = `urn:li:person:${v2MeData.id}`;
    console.log(`\n=== TEST 4: Using person URN from /v2/me: ${personUrn} ===`);
  } else {
    console.log(`\n=== TEST 4: Using person URN from DB: ${personUrn} ===`);
  }

  // Try Posts API with q=author finder
  console.log('\n=== TEST 5: GET /rest/posts?q=author (latest version) ===');
  await liGet(`/posts?q=author&author=${encodeURIComponent(personUrn)}&count=5`, realToken);

  // Test 6: Try shares endpoint with correct format
  console.log('\n=== TEST 6: GET /rest/shares?q=authors ===');
  await liGet(`/shares?q=authors&authors=List(${encodeURIComponent(personUrn)})&count=5`, realToken);

  // Test 7: Try shares without List wrapper
  console.log('\n=== TEST 7: GET /rest/shares (no List wrapper) ===');
  await liGet(`/shares?q=authors&authors=${encodeURIComponent(personUrn)}&count=5`, realToken);

  // Test 8: Try organizational shares if this is an org account
  console.log('\n=== TEST 8: GET /rest/organizationalEntityShares ===');
  await liGet(`/organizationalEntityShares?q=organizations&organization=${encodeURIComponent(`urn:li:organization:${platformUserId}`)}&count=5`, realToken);

  // Test 9: Try UGC posts (legacy)
  console.log('\n=== TEST 9: GET /v2/ugcPosts ===');
  const ugcRes = await fetch(`${LI_V2}/ugcPosts?q=authors&authors=${encodeURIComponent(personUrn)}&count=5`, {
    headers: {
      Authorization: `Bearer ${realToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
    },
  });
  const ugcData = await ugcRes.json();
  console.log(`  Status: ${ugcRes.status}`);
  console.log(`  Response: ${JSON.stringify(ugcData).substring(0, 500)}`);

  // Test 10: Try the new /rest/posts endpoint
  console.log('\n=== TEST 10: GET /rest/posts (direct) ===');
  await liGet(`/posts/${encodeURIComponent(personUrn)}`, realToken);

  // Test 11: Check what scopes were granted
  console.log('\n=== TEST 11: Check token info / scopes ===');
  const tokenInfoRes = await fetch(`${LI_BASE}/introspectToken`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${realToken}`,
    },
    body: JSON.stringify({ token: realToken }),
  });
  const tokenInfoData = await tokenInfoRes.json();
  console.log(`  Status: ${tokenInfoRes.status}`);
  console.log(`  Response: ${JSON.stringify(tokenInfoData).substring(0, 500)}`);

  await prisma.$disconnect();
  console.log('\n=== DONE ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
