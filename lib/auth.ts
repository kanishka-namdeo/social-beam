import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import authConfig from '@/auth.config';

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
          include: { Workspace: true },
        });

        if (!user) {
          logger.info('auth.authorize.failure', { email, reason: 'user_not_found' });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          logger.info('auth.authorize.failure', { email, reason: 'invalid_password' });
          return null;
        }

        logger.info('auth.authorize.success', { userId: user.id, email });
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          workspaceId: user.Workspace[0]?.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;
      }
      if (trigger === 'update' && session?.workspaceId) {
        token.workspaceId = session.workspaceId;
        logger.debug('auth.jwt.update', { userId: token.id as string });
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const user = session.user as unknown as Record<string, unknown>;
        user.id = token.id;
        user.workspaceId = token.workspaceId;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile?.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
          include: { Workspace: true },
        });

        if (!existingUser) {
      const newUser = await prisma.user.create({
            data: {
              id: crypto.randomUUID(),
              email: profile.email,
              name: profile.name ?? '',
              password: await bcrypt.hash(Math.random().toString(36), 12),
            },
          });
          const workspace = await prisma.workspace.create({
            data: { userId: newUser.id },
          });
          logger.info('auth.signIn.google.user_created', { userId: newUser.id, email: profile.email });
          if (user) {
            user.id = newUser.id;
            user.workspaceId = workspace.id;
          }
        } else if (existingUser.Workspace.length === 0) {
          const workspace = await prisma.workspace.create({
            data: { userId: existingUser.id },
          });
          logger.info('auth.signIn.google.workspace_created', { userId: existingUser.id, email: profile.email });
          if (user) {
            user.id = existingUser.id;
            user.workspaceId = workspace.id;
          }
        } else {
          logger.info('auth.signIn.google.user_existing', { userId: existingUser.id, email: profile.email });
          if (user) {
            user.id = existingUser.id;
            user.workspaceId = existingUser.Workspace[0].id;
          }
        }
      }
      return true;
    },
  },
});
