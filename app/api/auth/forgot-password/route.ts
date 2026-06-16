import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendPasswordResetEmail } from '@/lib/email/flows/send-password-reset-email';
import { checkAuthRateLimit, getClientIp } from '@/lib/auth-rate-limit';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkAuthRateLimit(ip, '/api/auth/forgot-password');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, message: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid email address.' },
        { status: 400 },
      );
    }

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: token,
          passwordResetExpiresAt: expiresAt,
        },
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const resetUrl = `${appUrl}/reset-password?token=${token}`;

      const emailResult = await sendPasswordResetEmail({
        email: user.email,
        name: user.name ?? user.email,
        resetUrl,
      });

      if (!emailResult.success) {
        logger.error('Failed to send password reset email', {
          email: user.email,
          error: emailResult.error,
        });
      } else {
        logger.info('Password reset email sent', { email: user.email });
      }
    } else {
      logger.info('Password reset requested for non-existent user', { email });
    }

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we sent a password reset link.',
    });
  } catch (error) {
    logger.error('Error in forgot-password route', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
