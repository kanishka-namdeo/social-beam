import type { PlatformName } from '@/lib/publish/types';

export interface ResolvedMention {
  handle: string;
  platform: string;
  platformUserId?: string;
}

interface ConnectedAccountInfo {
  platform: string;
  platformUserId: string;
  platformUsername: string | null;
}

const MENTION_REGEX = /<span[^>]*class="mention"[^>]*data-id="([^"]*)"[^>]*data-label="([^"]*)"[^>]*>@([^<]*)<\/span>/g;

const LINKEDIN_PLATFORMS: ReadonlySet<string> = new Set(['linkedin']);

const PLATFORMS_PLAINTEXT: ReadonlySet<string> = new Set([
  'x',
  'instagram',
  'facebook',
  'tiktok',
  'pinterest',
]);

export function extractMentions(html: string): ResolvedMention[] {
  const mentions: ResolvedMention[] = [];
  const seen = new Set<string>();

  let match: RegExpExecArray | null;
  const regex = new RegExp(MENTION_REGEX.source, 'g');

  while ((match = regex.exec(html)) !== null) {
    const [, id, label, handle] = match;
    const key = `${id}:${handle}`;
    if (!seen.has(key)) {
      seen.add(key);
      mentions.push({
        handle: handle.startsWith('@') ? handle : `@${handle}`,
        platform: '',
        platformUserId: id || undefined,
      });
    }
  }

  return mentions;
}

export function resolveMentionsForPlatform(
  html: string,
  platform: string,
  accounts: ConnectedAccountInfo[],
): string {
  if (!html || !html.includes('class="mention"')) {
    return stripAllHtml(html);
  }

  const regex = new RegExp(MENTION_REGEX.source, 'g');

  return html.replace(regex, (_fullMatch, id: string, label: string, handle: string) => {
    if (LINKEDIN_PLATFORMS.has(platform)) {
      return resolveLinkedinMention(id, label, handle, accounts);
    }

    if (PLATFORMS_PLAINTEXT.has(platform)) {
      return handle.startsWith('@') ? handle : `@${handle}`;
    }

    return handle;
  });
}

function resolveLinkedinMention(
  id: string,
  label: string,
  handle: string,
  accounts: ConnectedAccountInfo[],
): string {
  if (id && id !== handle) {
    const matchedAccount = accounts.find(
      (a) => a.platform === 'linkedin' && a.platformUserId === id,
    );
    if (matchedAccount) {
      const displayName = matchedAccount.platformUsername ?? label;
      return `@${displayName}`;
    }
  }

  return `@${label || handle.replace(/^@/, '')}`;
}

function stripAllHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function htmlToPlainText(html: string): string {
  return stripAllHtml(html);
}
