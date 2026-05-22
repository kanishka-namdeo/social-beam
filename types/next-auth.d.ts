import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      workspaceId?: string;
    } & DefaultSession['user'];
  }

  interface User {
    workspaceId?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    workspaceId?: string;
  }
}
