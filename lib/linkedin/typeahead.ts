import { logger } from '@/lib/logger';
import { decryptToken } from '@/lib/oauth/crypto';
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://api.linkedin.com';

const LINKEDIN_HEADERS = {
  'LinkedIn-Version': '202605',
  'X-Restli-Protocol-Version': '2.0.0',
  'Content-Type': 'application/json',
};

export interface LinkedInTypeaheadResult {
  urn: string;
  name: string;
  headline?: string;
  picture?: string;
  type: 'person' | 'organization';
}

/**
 * Search LinkedIn for people/organizations using the typeahead API.
 * Note: This requires the app to have typeahead access, which may not be
 * available to all LinkedIn apps. Falls back gracefully if unavailable.
 */
export async function searchLinkedInTypeahead(
  workspaceId: string,
  query: string,
  limit: number = 10
): Promise<LinkedInTypeaheadResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    // Get LinkedIn account for this workspace
    const account = await prisma.connectedAccount.findUnique({
      where: {
        workspaceId_platform: {
          workspaceId,
          platform: 'linkedin',
        },
      },
    });

    if (!account || account.status !== 'connected') {
      logger.debug('linkedin.typeahead.no_account', { workspaceId });
      return [];
    }

    if (account.tokenExpiry && account.tokenExpiry < new Date()) {
      logger.debug('linkedin.typeahead.token_expired', { workspaceId });
      return [];
    }

    const accessToken = decryptToken(account.accessToken);

    // Try the typeahead API
    // LinkedIn's typeahead endpoint searches for people and organizations
    const url = new URL(`${BASE_URL}/rest/typeahead`);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...LINKEDIN_HEADERS,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.warn('linkedin.typeahead.api_error', {
        status: response.status,
        error: errorBody,
        workspaceId,
      });
      // Typeahead may not be available for this app
      // Return empty array to fall back to local data
      return [];
    }

    const data = (await response.json()) as {
      elements?: Array<{
        urn?: string;
        name?: string;
        headline?: string;
        picture?: string;
        type?: string;
      }>;
    };

    const results: LinkedInTypeaheadResult[] = [];

    for (const element of data.elements ?? []) {
      if (!element.urn || !element.name) continue;

      // Parse URN to determine type
      // Format: urn:li:person:ABC123 or urn:li:organization:12345
      const urnParts = element.urn.split(':');
      const entityType = urnParts[2] ?? 'person';

      results.push({
        urn: element.urn,
        name: element.name,
        headline: element.headline,
        picture: element.picture,
        type: entityType === 'organization' ? 'organization' : 'person',
      });
    }

    logger.debug('linkedin.typeahead.success', {
      workspaceId,
      query,
      resultCount: results.length,
    });

    return results;
  } catch (error) {
    logger.error('linkedin.typeahead.error', {
      error: String(error),
      workspaceId,
      query,
    });
    // Graceful fallback - return empty array
    return [];
  }
}

/**
 * Convert a LinkedIn typeahead result to a mention suggestion format.
 */
export function typeaheadToMentionSuggestion(result: LinkedInTypeaheadResult) {
  return {
    id: result.urn, // Use URN as the ID for LinkedIn mentions
    label: result.name,
    platform: 'linkedin',
    avatarUrl: result.picture ?? null,
    type: 'typeahead' as const,
    headline: result.headline,
    linkedinType: result.type,
  };
}
