import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const RATE_LIMIT_COOKIE = 'sb-tool-rate-limit';
const MAX_GENERATIONS_PER_DAY = 10;

export interface RateLimitCookieData {
  date: string;
  count: number;
}

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function parseCookie(raw: string | undefined): RateLimitCookieData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RateLimitCookieData>;
    if (parsed.date && typeof parsed.count === 'number') {
      return { date: parsed.date, count: parsed.count };
    }
  } catch {
    // malformed cookie, treat as missing
  }
  return null;
}

export async function checkRateLimit(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RATE_LIMIT_COOKIE)?.value;
  const data = parseCookie(raw);

  if (!data || data.date !== todayKey()) {
    return false;
  }

  return data.count >= MAX_GENERATIONS_PER_DAY;
}

export async function recordGeneration(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RATE_LIMIT_COOKIE)?.value;
  const data = parseCookie(raw);

  const today = todayKey();
  const newCount = data?.date === today ? data.count + 1 : 1;

  cookieStore.set(RATE_LIMIT_COOKIE, JSON.stringify({ date: today, count: newCount }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}

export async function recordGenerationToResponse(
  response: NextResponse,
): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(RATE_LIMIT_COOKIE)?.value;
  const data = parseCookie(raw);

  const today = todayKey();
  const newCount = data?.date === today ? data.count + 1 : 1;

  response.cookies.set(RATE_LIMIT_COOKIE, JSON.stringify({ date: today, count: newCount }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
    path: '/',
  });
}
