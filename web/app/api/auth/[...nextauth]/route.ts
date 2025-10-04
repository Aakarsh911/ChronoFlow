
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow only same-origin redirects for safety
      if (url.startsWith(baseUrl)) return url
      // If NextAuth provides a relative path, join it with baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Fallback to homepage
      return baseUrl
    },
    async signIn({ user, account, profile }) {
      // Store user info in User table if not already present
      if (account?.provider === "google" && user.email) {
        await prisma.user.upsert({
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
      }
      return true;
    },
  },
});

export { handler as GET, handler as POST };
