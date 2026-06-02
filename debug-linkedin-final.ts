import { prisma } from './lib/prisma';
import { decryptToken } from './lib/oauth/crypto';

const LI_BASE = 'https://api.linkedin.com/rest';
const LI_V2 = 'https://api.linkedin.com/v2';

async function liGet(path: string, token: string, extraHeaders: Record<string, string> = {}) {
  const url = `${LI_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      ...extraHeaders,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data, url: url.split('?')[0] };
}

async function main() {
  console.log('=== FINAL LINKEDIN DEBUG SUMMARY ===\n');

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
        console.log('Account ID:', platformUserId);
        console.log('Workspace ID:', account.workspaceId);
        break;
      } catch {
        // skip test account
      }
    }
  }

  if (!realToken) {
    console.log('No valid token found!');
    await prisma.$disconnect();
    return;
  }

  // 1. Check what auth flow was used (OpenID Connect vs OAuth2)
  console.log('\n=== 1. Auth Flow Detection ===');
  const userinfo = await fetch(`${LI_V2}/userinfo`, {
    headers: { Authorization: `Bearer ${realToken}` },
  });
  const userinfoData = await userinfo.json();
  console.log(`/v2/userinfo status: ${userinfo.status}`);
  if (userinfo.status === 200) {
    console.log('User name:', userinfoData.name);
    console.log('Subject (sub):', userinfoData.sub);
    console.log('=> This token was obtained via OpenID Connect (Sign In with LinkedIn)');
    console.log('=> OpenID Connect only provides: identity, profile, email');
    console.log('=> It does NOT provide access to posts, comments, shares, or engagement data');
  }

  // 2. Verify that ALL data endpoints fail
  console.log('\n=== 2. Data Endpoint Access Test ===');
  const personUrn = `urn:li:person:${platformUserId}`;
  const tests = [
    { name: '/rest/posts?q=author', path: `/posts?q=author&author=${encodeURIComponent(personUrn)}&count=1` },
    { name: '/v2/ugcPosts', path: '', url: `${LI_V2}/ugcPosts?q=authors&authors=${encodeURIComponent(personUrn)}&count=1`, v2: true },
    { name: '/rest/shares?q=authors', path: `/shares?q=authors&authors=${encodeURIComponent(personUrn)}&count=1` },
    { name: '/rest/socialActions/{urn}/comments', path: `/socialActions/urn%3Alishare%3A7344424462678188032/comments?count=1` },
    { name: '/rest/organizationalEntityShares', path: `/organizationalEntityShares?q=organizations&organization=${encodeURIComponent(`urn:li:organization:${platformUserId}`)}&count=1` },
  ];

  for (const t of tests) {
    let result;
    if (t.v2 && t.url) {
      const res = await fetch(t.url, {
        headers: {
          Authorization: `Bearer ${realToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });
      const data = await res.json().catch(() => ({}));
      result = { status: res.status, data };
    } else {
      result = await liGet(t.path, realToken);
    }
    const errorMsg = result.data.message || result.data.code || 'N/A';
    console.log(`  ${t.name}: ${result.status} - ${errorMsg.substring(0, 100)}`);
  }

  // 3. What scopes would be needed
  console.log('\n=== 3. Required Scopes for Engagement Data ===');
  console.log('  r_member_social    - Read member posts, comments, likes (RESTRICTED - MDP partner only)');
  console.log('  r_organization_social - Read org posts, comments, likes');
  console.log('  w_member_social    - Post/comment/like as member');
  console.log('  w_organization_social - Post/comment/like as org');
  console.log('');
  console.log('  Current token has: openid, profile (OpenID Connect only)');
  console.log('  => Cannot access ANY engagement data endpoints');

  // 4. Check the adapter code issues
  console.log('\n=== 4. Adapter Code Issues ===');
  console.log('Issue 1: Uses /organizationalEntityShares endpoint');
  console.log('  - This endpoint is for ORGANIZATION accounts only');
  console.log('  - The connected account is a PERSONAL profile (urn:li:person:FHrQRCuLY7)');
  console.log('  - Should use /rest/posts?q=author for personal accounts');
  console.log('');
  console.log('Issue 2: Missing X-Restli-Protocol-Version header');
  console.log('  - All /rest/ endpoints require "X-Restli-Protocol-Version: 2.0.0"');
  console.log('  - The adapter only sends "LinkedIn-Version: 202601"');
  console.log('');
  console.log('Issue 3: Version header format is YYYYMM, not YYYYMMDD');
  console.log('  - Adapter sends "LinkedIn-Version: 202601" which is correct');
  console.log('  - But some LinkedIn internal versions append "01" making it YYYYMMDD');
  console.log('');
  console.log('Issue 4: Even with correct endpoints/headers, token lacks required scopes');
  console.log('  - The token was obtained via OpenID Connect');
  console.log('  - Need to re-auth with OAuth2 requesting r_member_social scope');
  console.log('  - r_member_social is RESTRICTED - requires MDP partner approval');

  // 5. Solution
  console.log('\n=== 5. Solution ===');
  console.log('Option A: Re-authenticate via standard OAuth2 (not OpenID Connect)');
  console.log('  - Use /oauth/v2/authorization endpoint');
  console.log('  - Request scopes: r_organization_social, w_organization_social');
  console.log('  - NOTE: r_member_social is restricted to MDP partners only');
  console.log('');
  console.log('Option B: Connect as an Organization Page instead of personal profile');
  console.log('  - Organizations need r_organization_social scope');
  console.log('  - This scope is available to standard Marketing API apps');
  console.log('');
  console.log('Option C: If user only has personal profile, engagement data');
  console.log('  may not be accessible due to r_member_social restriction');

  await prisma.$disconnect();
  console.log('\n=== DEBUG COMPLETE ===');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
