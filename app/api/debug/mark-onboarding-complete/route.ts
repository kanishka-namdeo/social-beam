import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { markSessionComplete } from '@/lib/db/onboarding';
import type { Session } from 'next-auth';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if ((session.user as { role?: string })?.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (process.env.NODE_ENV === 'production') {
      return new Response(JSON.stringify({ error: 'Debug endpoints disabled in production' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const typedSession = session as Session;
    const userId = typedSession.user.id ?? '';

    await markSessionComplete(userId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
