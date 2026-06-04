import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';
import type { UserRole } from '@/lib/role-guard';

export async function GET() {
  const session = await auth();
  const typedSession = session as Session;
  const userId = typedSession?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if ((typedSession?.user as { role?: UserRole })?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Debug endpoints disabled in production' }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({
    userId,
    sessionRole: (typedSession?.user as { role?: UserRole })?.role,
    databaseUser: user,
  });
}
