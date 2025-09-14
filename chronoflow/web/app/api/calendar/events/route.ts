import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import prisma from '../../../../lib/prisma';
import { fetchGoogleEvents } from '../../../../lib/events/google';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ events: [] });
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ events: [] });
  const url = new URL(req.url);
  const startParam = url.searchParams.get('start');
  const endParam = url.searchParams.get('end');
  const bufferWeeksParam = url.searchParams.get('bufferWeeks');
  let timeMin: Date;
  let timeMax: Date;
  if (startParam && endParam) {
    const s = new Date(startParam);
    const e = new Date(endParam);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e > s) {
      // apply optional multi-week buffer around requested window for prefetching
      const bufferWeeks = bufferWeeksParam ? Math.min(8, Math.max(0, parseInt(bufferWeeksParam))) : 0;
      if (bufferWeeks > 0) {
        timeMin = new Date(s); timeMin.setDate(timeMin.getDate() - 7 * bufferWeeks);
        timeMax = new Date(e); timeMax.setDate(timeMax.getDate() + 7 * bufferWeeks);
      } else {
        timeMin = s;
        timeMax = e;
      }
    } else {
      const now = new Date();
      timeMin = new Date(now.getTime() - 1000 * 60 * 60 * 12);
      timeMax = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
    }
  } else {
    const now = new Date();
    timeMin = new Date(now.getTime() - 1000 * 60 * 60 * 12);
    timeMax = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
  }

  console.log('[calendar API] range', { timeMin: timeMin.toISOString(), timeMax: timeMax.toISOString(), userId: user.id, dynamic: !!(startParam && endParam), bufferWeeks: bufferWeeksParam });
  const account = await prisma.account.findFirst({ where: { userId: user.id, provider: 'google' } });
  let needsReconnect = false;
  if (account && account.expires_at && Date.now() > account.expires_at * 1000 - 60_000 && !account.refresh_token) {
    needsReconnect = true;
  }
  const gcalEvents = await fetchGoogleEvents(user.id, { timeMin, timeMax });
  console.log('[calendar API] returning events', gcalEvents.length);
  // future: merge other providers (teams) here
  return NextResponse.json({ events: gcalEvents, meta: { needsReconnect, fetchedRange: { timeMin, timeMax } } });
}
