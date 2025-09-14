import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import prisma from '../../../../../lib/prisma';

// Danger: Deletes Google Account + IntegrationConnection for current user.
// Use only for development to force a fresh Google OAuth consent & refresh_token issuance.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
  try {
    const account = await prisma.account.findFirst({ where: { userId: user.id, provider: 'google' } });
    if (account) {
      await prisma.account.delete({ where: { id: account.id } });
    }
    await prisma.integrationConnection.deleteMany({ where: { userId: user.id, provider: 'gcal' } });
    console.log('[gcal hard-reset] removed google Account + gcal IntegrationConnection', { userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[gcal hard-reset] error', e);
    return NextResponse.json({ ok: false, error: e.message || 'error' }, { status: 500 });
  }
}
