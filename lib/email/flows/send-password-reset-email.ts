import { sendEmail } from '../service';
import { PasswordResetTemplate } from '../templates/password-reset';
import type { PasswordResetEmailPayload, EmailResult } from '../types';

export async function sendPasswordResetEmail(payload: PasswordResetEmailPayload): Promise<EmailResult> {
  return sendEmail({
    to: payload.email,
    subject: 'Reset your password',
    react: PasswordResetTemplate({
      name: payload.name,
      resetUrl: payload.resetUrl,
    }),
  });
}
