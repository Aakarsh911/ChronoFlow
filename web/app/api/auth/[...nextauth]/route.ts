
import NextAuth from "next-auth";
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { Provider } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID || "common",
      authorization: {
        params: {
          scope: 'openid email profile offline_access User.Read Calendars.Read Calendars.Read.Shared Calendars.ReadWrite Calendars.ReadWrite.Shared OnlineMeetings.Read OnlineMeetings.ReadWrite Mail.Read Mail.ReadWrite Mail.Send MailboxSettings.Read Chat.Read ChatMessage.Read ChannelMessage.Read.All Team.ReadBasic.All TeamMember.Read.All',
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Allow only same-origin redirects for safety
      if (url.startsWith(baseUrl)) return url
      // If NextAuth provides a relative path, join it with baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Fallback to homepage
      return baseUrl
    },
  async signIn({ user, account }: any) {
      // Store user info in User table if not already present
      if (account?.provider === "google" && user.email) {
        const savedUser = await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
          },
          create: {
            email: user.email,
            name: user.name,
            image: user.image,
            googleId: account.providerAccountId,
            onboarding: false,
          },
        });

        // Store Google tokens in Integration table
        await prisma.integration.upsert({
          where: {
            userId_provider: {
              userId: savedUser.id,
              provider: Provider.GOOGLE,
            },
          },
          update: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope,
            accountId: account.providerAccountId,
          },
          create: {
            userId: savedUser.id,
            provider: Provider.GOOGLE,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope,
            accountId: account.providerAccountId,
          },
        });
      }
      
      // Store Microsoft account info
      if (account?.provider === "azure-ad" && user.email) {
        // First, find or create the user
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          // Update existing user with Microsoft info if needed
          await prisma.user.update({
            where: { email: user.email },
            data: {
              name: user.name || existingUser.name,
              image: user.image || existingUser.image,
            },
          });
        } else {
          // Create new user
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              onboarding: false,
            },
          });
        }

        // Store Microsoft tokens in Integration table
        const userId = existingUser?.id || (await prisma.user.findUnique({
          where: { email: user.email },
        }))!.id;

        await prisma.integration.upsert({
          where: {
            userId_provider: {
              userId: userId,
              provider: Provider.MICROSOFT,
            },
          },
          update: {
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope,
            accountId: account.providerAccountId,
          },
          create: {
            userId: userId,
            provider: Provider.MICROSOFT,
            accessToken: account.access_token,
            refreshToken: account.refresh_token,
            expiresAt: account.expires_at ? new Date(account.expires_at * 1000) : null,
            scope: account.scope,
            accountId: account.providerAccountId,
          },
        });

        // Log the connected Microsoft account ID for observability
        try {
          console.log(
            `✓ Microsoft account connected: user=${user.email} accountId=${account.providerAccountId}`
          )
        } catch {}
      }
      return true;
    },
  async jwt({ token, account }: any) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
  async session({ session, token }: any) {
      session.accessToken = token.accessToken as string
      return session
    },
  },
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
