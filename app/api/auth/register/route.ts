import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { sendVerificationEmail } from '@/lib/email/flows/send-verification-email';
import { sendWelcomeEmail } from '@/lib/email/flows/send-welcome-email';
import { checkAuthRateLimit, getClientIp } from '@/lib/auth-rate-limit';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters').optional(),
  email: z.string().email('Invalid email format').max(254, 'Email must be at most 254 characters'),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId });

  try {
    const ip = getClientIp(req);
    const rateLimit = await checkAuthRateLimit(ip, '/api/auth/register');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 },
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      log.info('user.already_exists', { email });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 400 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const verificationToken = crypto.randomUUID();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create user, workspace, AND set verification token in one transaction
    await prisma.$transaction([
      prisma.user.create({
        data: {
          id: userId,
          name,
          email,
          password: hashedPassword,
          role: 'FREE_USER',
          emailVerificationToken: verificationToken,
          emailVerificationExpiresAt: verificationExpiresAt,
        },
      }),
      prisma.workspace.create({
        data: { id: crypto.randomUUID(), userId },
      }),
    ]);

    log.info('user.created', { userId, email });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    sendVerificationEmail({ email, name: name ?? '', verificationUrl }).catch((err) => {
      log.error('email.verification.failed', { userId, error: String(err) });
    });

    sendWelcomeEmail({ email, name: name ?? '' }).catch((err) => {
      log.error('email.welcome.failed', { userId, error: String(err) });
    });

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    log.error('register.failed', { requestId, error: String(error) });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
