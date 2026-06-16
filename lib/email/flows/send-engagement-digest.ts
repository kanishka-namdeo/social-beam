import { sendEmail } from '../service';
import { EngagementDigestTemplate } from '../templates/engagement-digest';
import type { EngagementDigestPayload, EmailResult } from '../types';

export async function sendEngagementDigest(payload: EngagementDigestPayload): Promise<EmailResult> {
  return sendEmail({
    to: payload.email,
    subject: 'Your engagement digest — SocialBeam',
    react: EngagementDigestTemplate({
      name: payload.name,
      commentCount: payload.commentCount,
      mentionCount: payload.mentionCount,
      dmCount: payload.dmCount,
      totalUnread: payload.totalUnread,
    }),
  });
}
