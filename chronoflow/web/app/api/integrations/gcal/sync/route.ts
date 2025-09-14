import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../../lib/auth';
import prisma from '../../../../../lib/prisma';

// Placeholder sync route: will later fetch events using Google Calendar API
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const integration = await prisma.integrationConnection.findFirst({ where: { userId: user.id, provider: 'gcal' } });
  if (!integration) return NextResponse.json({ error: 'Google Calendar not connected' }, { status: 400 });
  // TODO: Use Google API with stored tokens in Account to pull events.
  return NextResponse.json({ ok: true, message: 'Sync placeholder', integrationId: integration.id });
}
