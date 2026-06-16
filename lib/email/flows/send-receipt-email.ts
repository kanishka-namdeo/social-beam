import { sendEmail } from '../service';
import { SubscriptionReceiptTemplate } from '../templates/subscription-receipt';
import type { ReceiptEmailPayload, EmailResult } from '../types';

export async function sendReceiptEmail(payload: ReceiptEmailPayload): Promise<EmailResult> {
  return sendEmail({
    to: payload.email,
    subject: 'Payment confirmed — SocialBeam',
    react: SubscriptionReceiptTemplate({
      name: payload.name,
      amount: payload.amount,
      currency: payload.currency,
      plan: payload.plan,
      periodEnd: payload.periodEnd,
    }),
  });
}
