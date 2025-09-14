import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  // Custom logger to surface hidden errors causing generic ?error=Callback redirects
  logger: {
    error(code, metadata) {
      console.error('[next-auth][error]', code, metadata);
    },
    warn(code) {
      console.warn('[next-auth][warn]', code);
    },
    debug(code, metadata) {
      if (process.env.NEXT_AUTH_DEBUG || process.env.NODE_ENV === 'development') {
        console.debug('[next-auth][debug]', code, metadata);
      }
    }
  },
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
    async jwt(ctx) {
      try {
        const { token, user, account } = ctx;
        if (user) token.uid = (user as any).id || (user as any).uid;
        if (account?.provider === 'google') {
          token.gScope = account.scope;
        }
        return token;
      } catch (e) {
        console.error('[callbacks.jwt] error', e);
        throw e;
      }
    },
    async session(ctx) {
      try {
        const { session, token } = ctx;
        if (session.user && token?.uid) (session.user as any).id = token.uid;
        return session;
      } catch (e) {
        console.error('[callbacks.session] error', e);
        throw e;
      }
    },
    async signIn(params) {
      const { user, account, profile } = params;
      try {
        if (account?.provider === 'google') {
          console.log('[auth signIn:start]', {
            userId: user?.id,
            email: user?.email,
            hasAccess: !!account.access_token,
            hasRefresh: !!account.refresh_token,
            expires_at: account.expires_at,
            scope: account.scope,
            profileEmail: (profile as any)?.email,
            providerAccountId: account.providerAccountId,
            type: account.type,
          });
          if (!account.access_token) {
            console.error('[auth signIn] missing access_token in Google account object');
            return false;
          }
        }
        if (account?.provider === 'google' && user?.id) {
          // Ensure User row actually exists (PrismaAdapter may not have committed yet when using JWT sessions)
            const persistedUser = await prisma.user.findUnique({ where: { id: user.id } });
            if (!persistedUser) {
              console.warn('[auth signIn] user row not yet persisted; deferring IntegrationConnection creation');
              return true; // allow sign-in; we'll create later on first calendar access
            }
            const existingConn = await prisma.integrationConnection.findFirst({ where: { userId: user.id, provider: 'gcal' } });
            if (!existingConn) {
              try {
                await prisma.integrationConnection.create({ data: { userId: user.id, provider: 'gcal', status: 'connected', scopes: account.scope || undefined } });
                console.log('[auth signIn] created IntegrationConnection for gcal');
              } catch (icErr: any) {
                console.error('[auth signIn] failed to create IntegrationConnection (will defer)', icErr?.message);
              }
            }
        }
        return true;
      } catch (e: any) {
        console.error('[auth signIn] error', { message: e.message, stack: e.stack, raw: e });
        return '/login?error=Callback&reason=' + encodeURIComponent(e.message || 'unknown');
      }
    },
  },
  pages: { signIn: '/login' },
};
