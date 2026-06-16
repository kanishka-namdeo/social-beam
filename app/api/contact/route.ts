import { NextResponse } from 'next/server';
import { getResendClient } from '@/lib/email/client';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    if (typeof name !== 'string' || name.length > 200) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
    }

    if (typeof email !== 'string' || !email.includes('@') || email.length > 320) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (typeof subject !== 'string' || subject.length > 500) {
      return NextResponse.json({ error: 'Subject too long' }, { status: 400 });
    }

    if (typeof message !== 'string' || message.length > 5000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    const resend = getResendClient();

    if (!resend) {
      logger.info('contact.email.skipped', { email, subject, reason: 'no_resend_key' });
      return NextResponse.json({ success: true, message: 'Message received (dev mode)' });
    }

    const from = process.env.EMAIL_FROM ?? 'SocialBeam <hello@socialbeam.app>';
    const to = process.env.CONTACT_EMAIL ?? 'hello@socialbeam.ai';

    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Contact Form] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2>New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${escapeHtml(email)}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Subject:</td><td style="padding: 8px;">${escapeHtml(subject)}</td></tr>
          </table>
          <hr style="margin: 16px 0;" />
          <h3>Message</h3>
          <div style="white-space: pre-wrap; line-height: 1.5;">${escapeHtml(message)}</div>
        </div>
      `,
    });

    if (error) {
      logger.error('contact.email.send_error', { error: error.message, email });
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    logger.info('contact.email.sent', { email, subject });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('contact.form.error', { error: String(error) });
    return NextResponse.json({ error: 'Failed to process contact form' }, { status: 500 });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
