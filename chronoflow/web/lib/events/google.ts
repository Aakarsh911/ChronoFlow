import prisma from '../prisma';
import { UnifiedEvent } from './types';
import { google } from 'googleapis';

// Fetch primary calendar events upcoming timeframe
export async function fetchGoogleEvents(userId: string, { timeMin, timeMax }: { timeMin: Date; timeMax: Date; }): Promise<UnifiedEvent[]> {
  // Find Google account tokens
  const account = await prisma.account.findFirst({ where: { userId, provider: 'google' } });
  if (!account) {
    console.log('[gcal] no account for user', userId);
    return [];
  }
  // Lazy create IntegrationConnection if missing (signIn callback may have deferred)
  try {
    const existingConn = await prisma.integrationConnection.findFirst({ where: { userId, provider: 'gcal' } });
    if (!existingConn) {
      await prisma.integrationConnection.create({ data: { userId, provider: 'gcal', status: 'connected', scopes: account.scope || undefined } });
      console.log('[gcal] lazily created IntegrationConnection for gcal');
    }
  } catch (icErr: any) {
    console.warn('[gcal] failed lazy IntegrationConnection create', icErr?.message);
  }
  if (!account.access_token) {
    console.log('[gcal] no access_token present', { userId, hasRefresh: !!account.refresh_token });
    return [];
  }

  // Setup OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL ? process.env.NEXTAUTH_URL + '/api/auth/callback/google' : undefined
  );
  oauth2Client.setCredentials({
    access_token: account.access_token || undefined,
    refresh_token: account.refresh_token || undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Auto refresh if near expiry (googleapis handles refresh if refresh_token set)
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  try {
    const expired = account.expires_at && Date.now() > account.expires_at * 1000 - 60_000;
    if (expired && !account.refresh_token) {
      console.log('[gcal] token appears expired without refresh; attempting fetch anyway', { userId, expires_at: account.expires_at });
    }
    console.log('[gcal] fetching events', {
      userId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      expires_at: account.expires_at,
      hasRefresh: !!account.refresh_token
    });
    // List calendars (first page only; typically sufficient). In future paginate if nextPageToken.
    const calList = await calendar.calendarList.list({ maxResults: 50 });
    let calendars = (calList.data.items || []).filter(c => !c.deleted && c.accessRole !== 'freeBusyReader');
    const metaLog = calendars.map(c => ({ id: c.id, primary: (c as any).primary, accessRole: c.accessRole, summary: c.summary }));
    console.log('[gcal] calendars meta', metaLog);
    // Ensure primary calendar is included explicitly
    const primaryAlready = calendars.some(c => (c as any).primary || c.id === 'primary');
    if (!primaryAlready) {
      calendars = [...calendars, { id: 'primary', summary: 'Primary (forced)' } as any];
    }
    if (!calendars.length) {
      console.log('[gcal] no calendars returned; falling back to primary only');
      calendars.push({ id: 'primary', summary: 'Primary' } as any);
    }
    console.log('[gcal] calendar count', calendars.length);
    const allEvents: UnifiedEvent[] = [];
    for (const cal of calendars) {
      const calId = cal.id || 'primary';
      try {
        const res = await calendar.events.list({
          calendarId: calId,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 1000,
        });
        const items = res.data.items || [];
        console.log('[gcal] fetched calendar', calId, 'count', items.length);
        for (const ev of items) {
          const startIso = ev.start?.dateTime || ev.start?.date || '';
          const endIso = ev.end?.dateTime || ev.end?.date || startIso;
          allEvents.push({
            id: ev.id || Math.random().toString(36).slice(2),
            provider: 'gcal',
            calendarId: calId,
            title: ev.summary || '(No title)',
            start: startIso,
            end: endIso,
            allDay: !!ev.start?.date && !ev.start?.dateTime,
            raw: { kind: ev.kind, status: ev.status, calendarSummary: (cal as any).summary, accessRole: (cal as any).accessRole }
          });
        }
      } catch (ce: any) {
        console.warn('[gcal] calendar fetch failed', calId, ce?.message);
      }
    }
    // Dedupe by provider+id in case of shared calendars overlapping.
    const seen = new Set<string>();
    const deduped: UnifiedEvent[] = [];
    for (const ev of allEvents) {
      const key = ev.provider + ':' + ev.id;
      if (!seen.has(key)) { seen.add(key); deduped.push(ev); }
    }
    console.log('[gcal] total aggregated events', allEvents.length, 'deduped', deduped.length);
    return deduped;
  } catch (e: any) {
    // Only log unexpected errors (ignore missing refresh token noise)
    if (!/No refresh token is set/i.test(e?.message || '')) {
      console.error('fetchGoogleEvents error', e);
    } else {
      console.log('[gcal] suppressed refresh token error');
    }
    return [];
  }
}
