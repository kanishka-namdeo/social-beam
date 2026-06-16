import React from 'react';
import { getResendClient } from './client';
import { logger } from '@/lib/logger';
import type { EmailResult } from './types';
import { resendCircuitBreaker } from '@/lib/circuit-breaker';

const log = logger.child({ module: 'email' });

type SendEmailParams = {
  to: string;
  subject: string;
  react: React.ReactElement;
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function sendWithRetry(
  resend: ReturnType<typeof getResendClient>,
  params: { from: string; to: string; subject: string; react: React.ReactElement },
  logContext: { to: string; subject: string },
): Promise<EmailResult> {
  // Check circuit breaker first
  if (await resendCircuitBreaker.isOpen()) {
    logger.warn('email.circuit_open', logContext);
    return { success: false, error: 'Circuit breaker open for resend API' };
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await resend!.emails.send(params);

      if (error) {
        log.error('Resend API returned error', { ...logContext, error: error.message, attempt });
        await resendCircuitBreaker.recordFailure();
        return { success: false, error: error.message };
      }

      log.info('Email sent successfully', { ...logContext, id: data?.id, attempt });
      await resendCircuitBreaker.recordSuccess();
      return { success: true, id: data?.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(5, attempt);
        log.warn('Email send failed, retrying', { ...logContext, error: message, attempt, delayMs: delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        log.error('Email send failed after all retries', { ...logContext, error: message, attempts: MAX_RETRIES });
        await resendCircuitBreaker.recordFailure();
        try {
          const Sentry = await import('@sentry/nextjs');
          Sentry.captureException(err instanceof Error ? err : new Error(message));
        } catch {
          // Sentry not available
        }
        return { success: false, error: message };
      }
    }
  }
  return { success: false, error: 'Unexpected retry loop exit' };
}

export async function sendEmail({ to, subject, react }: SendEmailParams): Promise<EmailResult> {
  const resend = getResendClient();
  
  if (!resend) {
    log.info('Email send skipped (no RESEND_API_KEY) — dev noop', { to, subject });
    return { success: true, id: 'dev-noop' };
  }

  const from = process.env.EMAIL_FROM ?? 'SocialBeam <hello@socialbeam.app>';
  return sendWithRetry(resend, { from, to, subject, react }, { to, subject });
}
