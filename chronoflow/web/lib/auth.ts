import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
          access_type: 'offline',
          prompt: 'consent',
          include_granted_scopes: 'true'
        }
      }
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;
        const email = creds.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(creds.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = (user as any).id || (user as any).uid;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.uid) (session.user as any).id = token.uid;
      return session;
    },
    async signIn({ user, account, profile }) {
      // When a user signs in with Google, ensure an IntegrationConnection row exists for gcal
      try {
        if (account?.provider === 'google' && user?.id) {
          // capture scopes for reference
            const scopes = account.scope;
            await prisma.integrationConnection.upsert({
              where: {
                // no unique on provider+user, emulate via find first then create
                // We'll do manual logic instead of where
                id: 'dummy' // placeholder will be ignored
              },
              update: {},
              create: { userId: user.id, provider: 'gcal', status: 'connected', scopes: scopes || undefined }
            }).catch(async () => {
              // fallback: check existing then create if missing
              const existing = await prisma.integrationConnection.findFirst({ where: { userId: user.id, provider: 'gcal' } });
              if (!existing) {
                await prisma.integrationConnection.create({ data: { userId: user.id, provider: 'gcal', status: 'connected', scopes: account?.scope || undefined } });
              }
            });
        }
      } catch (e) {
        console.error('signIn integration linkage error', e);
      }
      return true;
    }
  },
  pages: { signIn: '/login' },
};
