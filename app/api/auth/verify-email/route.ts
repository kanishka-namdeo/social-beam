import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { checkAuthRateLimit, getClientIp } from '@/lib/auth-rate-limit';

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const ip = getClientIp(request);
    const rateLimit = await checkAuthRateLimit(ip, '/api/auth/verify-email');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);

    if (!parsed.success) {
      log.warn('verify_email.invalid_request');
      return NextResponse.json(
        { success: false, message: 'Invalid request.' },
        { status: 400 },
      );
    }

    const { token } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      log.warn('verify_email.invalid_or_expired', { token });
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification token.' },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    log.info('verify_email.success', { userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('verify_email.failed', { error: String(error) });
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
