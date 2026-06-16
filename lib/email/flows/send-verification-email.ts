import { sendEmail } from '../service';
import { EmailVerificationTemplate } from '../templates/email-verification';
import type { VerificationEmailPayload, EmailResult } from '../types';

export async function sendVerificationEmail(payload: VerificationEmailPayload): Promise<EmailResult> {
  return sendEmail({
    to: payload.email,
    subject: 'Verify your email address',
    react: EmailVerificationTemplate({
      name: payload.name,
      verificationUrl: payload.verificationUrl,
    }),
  });
}
