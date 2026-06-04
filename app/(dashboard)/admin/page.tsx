import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AdminClient } from './admin-client';
import type { UserRole } from '@/lib/role-guard';

export default async function AdminPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: UserRole } | undefined;

  // Resolve role with DB fallback
  let userRole = user?.role;
  if (!userRole && user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    userRole = dbUser?.role ?? 'FREE_USER';
  }

  if (userRole !== 'ADMIN') {
    redirect('/dashboard');
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin - User Management</h1>
        <p className="text-sm text-muted-foreground">Manage user roles and subscriptions.</p>
      </div>
      <AdminClient users={users} />
    </div>
  );
}
