import { sendEmail } from '../service';
import { PublishNotificationTemplate } from '../templates/publish-notification';
import type { PublishNotificationPayload, EmailResult } from '../types';

export async function sendPublishNotification(payload: PublishNotificationPayload): Promise<EmailResult> {
  return sendEmail({
    to: payload.email,
    subject: `Publishing summary — ${payload.publishedCount} published, ${payload.failedCount} failed`,
    react: PublishNotificationTemplate({
      name: payload.name,
      publishedCount: payload.publishedCount,
      failedCount: payload.failedCount,
      results: payload.results,
    }),
  });
}
