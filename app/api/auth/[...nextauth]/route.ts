import { handlers } from '@/lib/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { checkAuthRateLimit, getClientIp } from '@/lib/auth-rate-limit';

export const GET = (req: NextRequest) => handlers.GET(req);

export const POST = async (req: NextRequest) => {
  const url = new URL(req.url);
  const isCredentialsCallback = url.pathname.endsWith('/auth/callback/credentials');

  if (isCredentialsCallback) {
    const ip = getClientIp(req);
    const rateLimit = await checkAuthRateLimit(ip, '/api/auth/login');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }
  }

  return handlers.POST(req);
};
