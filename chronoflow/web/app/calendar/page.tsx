import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import prisma from '../../lib/prisma';
import CalendarClient from './CalendarClient';
import { fetchGoogleEvents } from '../../lib/events/google';

export default async function CalendarPage() {
  const session = await getServerSession(authOptions);
  let initialEvents: any[] = [];
  let initialNeedsReconnect = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (user) {
      // Derive current week visible range for initial SSR (FullCalendar's timeGridWeek usually starts on Monday by locale; we'll assume Sunday start for simplicity)
      const now = new Date();
      const start = new Date(now);
      start.setHours(0,0,0,0);
      // Get first day of week (Sunday)
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7); // exclusive end
      const timeMin = start;
      const timeMax = end;
      const account = await prisma.account.findFirst({ where: { userId: user.id, provider: 'google' } });
      if (account && account.expires_at && Date.now() > account.expires_at * 1000 - 60_000 && !account.refresh_token) {
        initialNeedsReconnect = true;
      }
      initialEvents = await fetchGoogleEvents(user.id, { timeMin, timeMax });
    }
  }
  return (
    <div className="h-[calc(100vh-4rem)] pt-4 pr-4 pb-4 pl-2 ml-4">{/* account for navbar height + left margin */}
      <div className="w-full h-full rounded-lg border bg-white overflow-hidden flex flex-col shadow-sm">
        <CalendarClient initialEvents={initialEvents} initialNeedsReconnect={initialNeedsReconnect} />
      </div>
    </div>
  );
}
