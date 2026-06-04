import { DefaultSession } from 'next-auth';
import type { UserRole } from '@/lib/role-guard';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: UserRole;
      workspaceId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    workspaceId?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    workspaceId?: string;
  }
}
