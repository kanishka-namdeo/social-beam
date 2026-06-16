import { sendEmail } from '../service';
import { WelcomeTemplate } from '../templates/welcome';
import type { WelcomeEmailPayload, EmailResult } from '../types';

export async function sendWelcomeEmail(payload: WelcomeEmailPayload): Promise<EmailResult> {
  return sendEmail({
    to: payload.email,
    subject: 'Welcome to SocialBeam!',
    react: WelcomeTemplate({ name: payload.name }),
  });
}
