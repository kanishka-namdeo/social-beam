import { logger } from '@/lib/logger';

export interface AccountInfoResult {
  platformUserId: string;
  platformUsername: string;
  avatarUrl?: string;
  followerCount?: number;
}

/**
 * Fetch account info from platform APIs using an access token.
 * Calls platform-specific endpoints to get username, avatar, follower count.
 */
export async function fetchAccountInfo(
  platform: string,
  accessToken: string,
): Promise<AccountInfoResult | null> {
  const platformLower = platform.toLowerCase();

  try {
    switch (platformLower) {
      case 'x':
      case 'twitter':
        return await fetchXAccountInfo(accessToken);
      case 'linkedin':
        return await fetchLinkedinAccountInfo(accessToken);
      case 'tiktok':
        return await fetchTiktokAccountInfo(accessToken);
      case 'pinterest':
        return await fetchPinterestAccountInfo(accessToken);
      case 'instagram':
        return await fetchInstagramAccountInfo(accessToken);
      case 'facebook':
        return await fetchFacebookAccountInfo(accessToken);
      case 'threads':
        return await fetchThreadsAccountInfo(accessToken);
      case 'googlebusiness':
        return await fetchGoogleBusinessAccountInfo(accessToken);
      case 'youtube':
        return await fetchYoutubeAccountInfo(accessToken);
      case 'bluesky':
        return null; // Bluesky uses direct auth, account info fetched separately during session creation
      default:
        logger.warn('oauth.account_info.unsupported_platform', { platform });
        return null;
    }
  } catch (err) {
    logger.error('oauth.account_info.fetch_failed', { platform, error: String(err) });
    return null;
  }
}

async function fetchXAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const response = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=username,profile_image_url,public_metrics',
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`X account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const user = data.data as Record<string, unknown>;

  const metrics = user.public_metrics as Record<string, number> | undefined;

  return {
    platformUserId: user.id as string,
    platformUsername: `@${user.username as string}`,
    avatarUrl: user.profile_image_url as string | undefined,
    followerCount: metrics?.followers_count,
  };
}

async function fetchLinkedinAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const response = await fetch('https://api.linkedin.com/v2/userinfo', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`LinkedIn account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;

  return {
    platformUserId: data.sub as string,
    platformUsername: data.name as string,
    avatarUrl: data.picture as string | undefined,
  };
}

async function fetchTiktokAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const response = await fetch('https://open.tiktokapis.com/v2/user/info/', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`TikTok account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const userInfo = data.data as Record<string, unknown>;
  const user = userInfo?.user as Record<string, unknown>;

  return {
    platformUserId: user?.open_id as string,
    platformUsername: user?.display_name as string,
    avatarUrl: user?.avatar_url as string | undefined,
    followerCount: user?.follower_count as number | undefined,
  };
}

async function fetchPinterestAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const response = await fetch('https://api.pinterest.com/v5/user_account', {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Pinterest account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;

  return {
    platformUserId: data.id as string,
    platformUsername: (data.username ?? data.full_name) as string,
    avatarUrl: data.profile_image as string | undefined,
    followerCount: data.follower_count as number | undefined,
  };
}

/**
 * Fetch Instagram Business account info via Graph API.
 * Requires pages_show_list and instagram_basic permissions.
 */
async function fetchInstagramAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  // First, get the user's pages to find the Instagram Business account
  const pagesResponse = await fetch(
    'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,instagram_business_account{id,username,profile_picture_url,followers_count}&access_token=' + accessToken,
    { method: 'GET' }
  );

  if (!pagesResponse.ok) {
    throw new Error(`Instagram account info failed: ${pagesResponse.status}`);
  }

  const pagesData = await pagesResponse.json() as Record<string, unknown>;
  const pages = pagesData.data as Array<Record<string, unknown>> | undefined;

  if (!pages || pages.length === 0) {
    throw new Error('No Facebook pages with Instagram Business account found');
  }

  // Use the first page with an Instagram Business account
  const page = pages.find(p => p.instagram_business_account) ?? pages[0];
  const igAccount = page.instagram_business_account as Record<string, unknown> | undefined;

  if (igAccount) {
    return {
      platformUserId: igAccount.id as string,
      platformUsername: `@${igAccount.username as string}`,
      avatarUrl: igAccount.profile_picture_url as string | undefined,
      followerCount: igAccount.followers_count as number | undefined,
    };
  }

  return {
    platformUserId: page.id as string,
    platformUsername: page.name as string,
  };
}

/**
 * Fetch Facebook Page info via Graph API.
 */
async function fetchFacebookAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const pagesResponse = await fetch(
    'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,picture,fan_count&access_token=' + accessToken,
    { method: 'GET' }
  );

  if (!pagesResponse.ok) {
    throw new Error(`Facebook account info failed: ${pagesResponse.status}`);
  }

  const pagesData = await pagesResponse.json() as Record<string, unknown>;
  const pages = pagesData.data as Array<Record<string, unknown>> | undefined;

  if (!pages || pages.length === 0) {
    throw new Error('No Facebook pages found');
  }

  const page = pages[0];
  const picture = page.picture as Record<string, unknown> | undefined;

  return {
    platformUserId: page.id as string,
    platformUsername: page.name as string,
    avatarUrl: (picture?.data as Record<string, string>)?.url as string | undefined,
    followerCount: page.fan_count as number | undefined,
  };
}

async function fetchThreadsAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const response = await fetch(
    'https://graph.facebook.com/v22.0/me?fields=id,name,threads_profile_picture_url&access_token=' + accessToken,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error(`Threads account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  return {
    platformUserId: data.id as string,
    platformUsername: (data.name as string) ?? `@${data.id as string}`,
    avatarUrl: data.threads_profile_picture_url as string | undefined,
  };
}

async function fetchGoogleBusinessAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const response = await fetch(
    'https://mybusiness.googleapis.com/v4/accounts',
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Google Business account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const accounts = (data.accounts as Array<Record<string, unknown>>) ?? [];
  if (accounts.length === 0) {
    throw new Error('No Google Business accounts found');
  }

  const account = accounts[0];
  const accountName = account.name as string;
  const accountId = accountName.split('/').pop() ?? accountName;

  return {
    platformUserId: accountId,
    platformUsername: (account.title ?? accountId) as string,
  };
}

async function fetchYoutubeAccountInfo(accessToken: string): Promise<AccountInfoResult> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`YouTube account info failed: ${response.status}`);
  }

  const data = await response.json() as Record<string, unknown>;
  const items = (data.items as Array<Record<string, unknown>>) ?? [];
  if (items.length === 0) {
    throw new Error('No YouTube channels found');
  }

  const channel = items[0];
  const snippet = channel.snippet as Record<string, unknown> | undefined;

  return {
    platformUserId: channel.id as string,
    platformUsername: (snippet?.title as string) ?? (channel.id as string),
  };
}
