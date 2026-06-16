import { sendEmail } from '../service';
import { RedditDigestTemplate } from '../templates/reddit-digest';
import type { RedditDigestPayload, EmailResult } from '../types';

export async function sendRedditDigest(payload: RedditDigestPayload): Promise<EmailResult> {
  return sendEmail({
    to: payload.email,
    subject: 'Your Reddit intelligence digest — SocialBeam',
    react: RedditDigestTemplate({
      name: payload.name,
      trends: payload.trends,
      highIntentCount: payload.highIntentCount,
    }),
  });
}
