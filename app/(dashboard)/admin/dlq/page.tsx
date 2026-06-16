import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/role-guard';
import { PageHeader } from '@/components/shared/page-header';
import { DLQClient } from './dlq-client';

export default async function DLQPage() {
  const session = await auth();
  const user = session?.user as { id?: string; role?: UserRole } | undefined;

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dead Letter Queue"
        description="Inspect and manage failed operations that could not be completed."
        backLink={{ href: "/admin", label: "Admin" }}
      />
      <DLQClient />
    </div>
  );
}
