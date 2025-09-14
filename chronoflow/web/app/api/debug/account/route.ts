import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({});
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({});
  const account = await prisma.account.findFirst({ where: { userId: user.id, provider: 'google' } });
  if (!account) return NextResponse.json({ hasAccount: false });
  return NextResponse.json({
    hasAccount: true,
    expires_at: account.expires_at,
    hasAccess: !!account.access_token,
    hasRefresh: !!account.refresh_token,
    scope: account.scope,
    // do not return tokens themselves
  });
}
