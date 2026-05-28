import type { BlogPost } from "@/lib/blog"
import { Codeblock, H2, H3, P, A, Callout } from "@/components/blog/prose"

const post: BlogPost = {
  slug: "syncing-google-and-microsoft-calendars-programmatically",
  title: "How We Sync Google Calendar and Microsoft Outlook in One Workspace",
  description:
    "A technical deep dive into building incremental calendar sync across Google and Microsoft using syncTokens, deltaLinks, and multi-provider OAuth.",
  date: "2025-05-27",
  tags: ["engineering", "google-calendar", "microsoft-graph", "oauth", "sync"],
  author: "ChronoFlow Team",
  readTime: "8 min",
  content: () => (
    <article>
      <P>
        Most engineering teams aren't purely Google or purely Microsoft. Someone has a Gmail calendar,
        someone else is on Outlook, and your company Slack bridges the two. The moment you try to
        find a common free slot for four people across both ecosystems, you're opening three apps and
        doing the mental math yourself.
      </P>
      <P>
        We built ChronoFlow to solve this — one calendar view that pulls from Google Calendar and
        Microsoft Outlook simultaneously, with incremental updates so changes appear without constant
        full re-fetches hammering the APIs. This post is about how we did it: the OAuth setup, the
        incremental sync mechanisms each provider offers, and the normalization layer that makes
        both event schemas look the same to the rest of the app.
      </P>
      <P>
        Fair warning: both Google and Microsoft have quirks. We'll get into those.
      </P>

      <H2 id="oauth">The OAuth Challenge</H2>
      <P>
        The first problem is authentication. We use NextAuth with two providers simultaneously —
        Google via <code>GoogleProvider</code> and Microsoft via <code>AzureADProvider</code>.
        Getting the right scopes is critical: too narrow and you can't read calendar data; too broad
        and users (rightly) get suspicious.
      </P>
      <P>
        For Google, we need:
      </P>
      <Codeblock language="typescript">{`GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      scope: [
        'openid email profile',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send',
      ].join(' '),
      access_type: 'offline',   // critical — gets us a refresh token
      prompt: 'consent',        // forces the consent screen every time
    },
  },
})`}</Codeblock>
      <P>
        The <code>access_type: 'offline'</code> and <code>prompt: 'consent'</code> combination is
        important. Without it, Google only issues an access token with no refresh token, and your
        integration dies the moment the token expires (usually in 60 minutes). You need the consent
        screen to force a refresh token on every login.
      </P>
      <P>
        For Microsoft, the scope list is longer because the Graph API is more granular:
      </P>
      <Codeblock language="typescript">{`AzureADProvider({
  clientId: process.env.AZURE_AD_CLIENT_ID!,
  clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
  tenantId: process.env.AZURE_AD_TENANT_ID || "common",
  authorization: {
    params: {
      scope: [
        'openid email profile offline_access',
        'User.Read',
        'Calendars.Read Calendars.Read.Shared',
        'Calendars.ReadWrite Calendars.ReadWrite.Shared',
        'OnlineMeetings.Read OnlineMeetings.ReadWrite',
        'Mail.Read Mail.ReadWrite Mail.Send',
        'MailboxSettings.Read',
        'Chat.Read ChatMessage.Read',
        'ChannelMessage.Read.All',
        'Team.ReadBasic.All TeamMember.Read.All',
      ].join(' '),
    },
  },
})`}</Codeblock>
      <P>
        <code>offline_access</code> is the Microsoft equivalent of Google's <code>access_type: 'offline'</code> — it's what gets you a refresh token. Without it, your Microsoft integration lasts at most 60–90 minutes.
      </P>
      <P>
        We store both providers' tokens in a shared <code>Integration</code> table in Postgres:
      </P>
      <Codeblock language="prisma">{`model Integration {
  id           String    @id @default(uuid())
  userId       String
  provider     Provider  // enum: GOOGLE | MICROSOFT | JIRA | ...
  accessToken  String?
  refreshToken String?
  scope        String?
  expiresAt    DateTime?
  accountId    String?
  data         Json?

  @@unique([userId, provider])
}`}</Codeblock>
      <P>
        The <code>@@unique([userId, provider])</code> constraint means each user gets at most one
        row per provider, which simplifies upserts during the NextAuth <code>signIn</code> callback.
      </P>

      <H2 id="google-sync">Incremental Sync — Google</H2>
      <P>
        Google Calendar's incremental sync is built around <strong>sync tokens</strong>. The idea
        is simple: on your first fetch, Google returns all the events you asked for plus a
        <code>nextSyncToken</code> in the response. On subsequent fetches, you pass that token as
        the <code>syncToken</code> parameter, and Google only returns events that changed since you
        last synced.
      </P>
      <Codeblock language="typescript">{`// First sync — no syncToken, full fetch
const eventsResponse = await calendar.events.list({
  calendarId: cal.id,
  timeMin: startDate,
  timeMax: endDate,
  singleEvents: true,
  orderBy: 'startTime',
  maxResults: 250,
})

// Save the sync token for next time
const syncToken = eventsResponse.data.nextSyncToken
await prisma.calendarSync.upsert({
  where: { userId_source_calendarId: { userId, source: 'GOOGLE', calendarId: cal.id } },
  update: { syncToken, lastSyncedAt: new Date() },
  create: { userId, source: 'GOOGLE', calendarId: cal.id, syncToken, lastSyncedAt: new Date() },
})

// Incremental sync — pass syncToken, get only changes
const changesResponse = await calendar.events.list({
  calendarId: cal.id,
  syncToken: existingSyncToken,
  singleEvents: true,
})`}</Codeblock>
      <P>
        We store the sync token in the <code>CalendarSync</code> table alongside some bookkeeping
        fields:
      </P>
      <Codeblock language="prisma">{`model CalendarSync {
  id                 String      @id @default(uuid())
  userId             String
  source             EventSource // GOOGLE | MICROSOFT
  calendarId         String
  calendarName       String?
  lastSyncedAt       DateTime?
  syncToken          String?     // Google Calendar incremental sync
  deltaLink          String?     // Microsoft Graph incremental sync
  consecutiveErrors  Int         @default(0)
  lastSyncError      String?

  @@unique([userId, source, calendarId])
}`}</Codeblock>
      <P>
        The gotcha: <strong>sync tokens expire</strong>. If you don't sync a calendar for a while
        (Google's docs say the window is "at least a few days" but it varies), the token becomes
        invalid and you'll get a <code>410 Gone</code> response. You have to catch that and fall
        back to a full re-sync:
      </P>
      <Codeblock language="typescript">{`try {
  const changesResponse = await calendar.events.list({
    calendarId: cal.id,
    syncToken: existingSyncToken,
  })
  // process changes...
} catch (error: any) {
  if (error?.code === 410) {
    // Sync token expired — do a full re-sync and get a fresh token
    console.warn(\`Sync token expired for calendar \${cal.id}, doing full re-sync\`)
    await prisma.calendarSync.update({
      where: { userId_source_calendarId: { userId, source: 'GOOGLE', calendarId: cal.id } },
      data: { syncToken: null },
    })
    return fullSync(cal.id, startDate, endDate)
  }
  throw error
}`}</Codeblock>
      <P>
        The 410 handling is easy to miss. We initially didn't have it and users would see
        calendar data go stale after a few days of inactivity, which is a bad experience.
      </P>

      <H2 id="microsoft-sync">Incremental Sync — Microsoft</H2>
      <P>
        Microsoft Graph uses a different mechanism: <strong>delta queries</strong>. Instead of a
        token you pass as a query parameter, you get back a <code>@odata.deltaLink</code> URL in
        the response — a fully formed URL you call directly on subsequent syncs.
      </P>
      <Codeblock language="typescript">{`// First sync — use /calendarView/delta endpoint
const firstResponse = await client
  .api(\`/me/calendars/\${calendarId}/calendarView/delta\`)
  .header('Prefer', 'outlook.timezone="UTC"')
  .query({
    startDateTime: startDate,
    endDateTime: endDate,
    $select: 'subject,bodyPreview,start,end,location,attendees,organizer,isAllDay,webLink',
    $top: 250,
  })
  .get()

// Collect all pages
let allEvents = [...firstResponse.value]
let nextLink = firstResponse['@odata.nextLink']

while (nextLink) {
  const pageResponse = await client.api(nextLink).get()
  allEvents = [...allEvents, ...pageResponse.value]
  nextLink = pageResponse['@odata.nextLink']
}

// Save the deltaLink — this is what you'll call next time
const deltaLink = firstResponse['@odata.deltaLink']
await prisma.calendarSync.update({
  where: { userId_source_calendarId: { userId, source: 'MICROSOFT', calendarId } },
  data: { deltaLink, lastSyncedAt: new Date() },
})

// Subsequent sync — call the deltaLink directly
const deltaResponse = await client.api(existingDeltaLink).get()`}</Codeblock>
      <P>
        A few things to watch for with Microsoft's delta approach:
      </P>
      <P>
        <strong>Pagination and the deltaLink location.</strong> During the initial full fetch, you
        might get multiple pages linked via <code>@odata.nextLink</code>. The
        <code>@odata.deltaLink</code> only appears on the <em>last</em> page of the first response.
        If you grab the deltaLink too early, you'll miss events.
      </P>
      <P>
        <strong>Deleted events come back differently.</strong> When an event is deleted on the
        Microsoft side, the delta response returns a minimal object with an
        <code>@removed</code> property rather than a full event body. You have to check for this:
      </P>
      <Codeblock language="typescript">{`for (const event of deltaResponse.value) {
  if (event['@removed']) {
    // Event was deleted — remove it from our database
    await prisma.calendarEvent.deleteMany({
      where: { userId, source: 'MICROSOFT', sourceId: event.id },
    })
    continue
  }
  // Otherwise, upsert the event normally
}`}</Codeblock>
      <P>
        <strong>The timezone header matters.</strong> By default, Microsoft returns times in the
        user's mailbox timezone, which can be anything. Passing
        <code>Prefer: outlook.timezone="UTC"</code> normalizes everything to UTC before it hits
        your code. This saves a lot of parsing pain.
      </P>
      <P>
        <strong>All-day events don't have a time component.</strong> Microsoft represents all-day
        events with <code>isAllDay: true</code> and a <code>dateTime</code> set to midnight of the
        day. You have to strip the time portion when storing them.
      </P>

      <H2 id="normalizing">Normalizing Events Across Providers</H2>
      <P>
        Google and Microsoft return completely different JSON schemas for what is fundamentally the
        same thing — a calendar event. The normalization layer is where we make both look
        identical to the rest of the application.
      </P>
      <P>
        We defined a common <code>ExternalCalendarEvent</code> interface that both fetch functions
        output to:
      </P>
      <Codeblock language="typescript">{`export interface ExternalCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string  // ISO 8601, present for timed events
    date?: string      // YYYY-MM-DD, present for all-day events
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  location?: string
  attendees?: Array<{
    email?: string
    name?: string
    responseStatus?: string
  }>
  organizer?: {
    email?: string
    name?: string
  }
  htmlLink?: string
  hangoutLink?: string
  calendarId: string
  calendarName?: string
  source: 'google' | 'microsoft'
}`}</Codeblock>
      <P>
        Google events map to this pretty naturally — most field names are similar. Microsoft events
        need more translation. <code>event.subject</code> becomes <code>summary</code>,
        <code>event.webLink</code> becomes <code>htmlLink</code>, and the attendee structure goes
        from <code>{"{ emailAddress: { address, name } }"}</code> to a flat <code>{"{ email, name }"}</code>.
      </P>
      <P>
        For all-day events, we use the presence of <code>dateTime</code> vs <code>date</code> to
        set <code>isAllDay</code>:
      </P>
      <Codeblock language="typescript">{`const isAllDay = !event.start.dateTime

const startTime = isAllDay
  ? new Date(event.start.date + 'T00:00:00Z')
  : new Date(event.start.dateTime!)

const endTime = isAllDay
  ? new Date(event.end.date + 'T00:00:00Z')
  : new Date(event.end.dateTime!)`}</Codeblock>
      <P>
        In the database we use the <code>sourceId</code> field (the external event ID from
        Google or Microsoft) combined with the <code>source</code> enum and <code>userId</code>
        as a unique constraint to prevent duplicate events:
      </P>
      <Codeblock language="prisma">{`model CalendarEvent {
  id               String      @id @default(uuid())
  userId           String
  source           EventSource // GOOGLE | MICROSOFT | INTERNAL
  sourceId         String?     // External event ID
  sourceCalendarId String?

  // ...other fields

  @@unique([userId, source, sourceId])
}`}</Codeblock>
      <P>
        This constraint means we can safely upsert on every sync without worrying about creating
        duplicates if the sync runs twice in quick succession.
      </P>

      <H2 id="lessons">What We Learned</H2>
      <P>
        <strong>Rate limits are asymmetric.</strong> Google Calendar's API is generous — 1,000,000
        queries per day on the free tier and generous per-user-per-second limits. Microsoft Graph is
        stricter, particularly for the delta endpoint. We hit 429s on Microsoft during initial bulk
        syncs for users with many calendars. We now add a short delay between calendar fetches on
        the Microsoft side and fall back to exponential backoff on 429s.
      </P>
      <P>
        <strong>Microsoft refresh tokens expire after 90 days of inactivity.</strong> This one
        bit us. If a user connects their Microsoft account and then doesn't use ChronoFlow for
        90 days, their refresh token silently expires. The next time they open the app, the token
        refresh fails with an <code>invalid_grant</code> error and we have to send them back through
        the OAuth flow. We now surface this as a clear "Reconnect Microsoft" prompt rather than a
        silent data gap.
      </P>
      <P>
        <strong>The unique constraint catches a lot of bugs.</strong> The
        <code>@@unique([userId, source, sourceId])</code> on <code>CalendarEvent</code> has saved
        us multiple times when sync jobs ran with overlapping date ranges. Without it, we'd have
        silent duplicates that would be nearly impossible to clean up.
      </P>
      <P>
        <strong>Incremental sync actually matters.</strong> After moving from full re-fetches to
        incremental sync, our Calendar API call volume dropped by roughly 75–80% for active users.
        Google's syncToken and Microsoft's deltaLink both genuinely work, and they make the difference
        between a responsive sync and one that feels sluggish.
      </P>

      <P className="mt-10 border-t border-[var(--cf-border)] pt-8 text-[var(--cf-text-muted)]">
        This is part of what powers{" "}
        <A href="https://chronoflow.work">ChronoFlow</A>'s unified calendar view — if you're evaluating
        tools that handle cross-provider scheduling out of the box, see how we compare to{" "}
        <A href="/alternatives/motion">Motion</A>,{" "}
        <A href="/alternatives/reclaim">Reclaim</A>, and{" "}
        <A href="/alternatives/clockwise">Clockwise</A>. Or join the beta at{" "}
        <A href="https://chronoflow.work/waitlist">chronoflow.work/waitlist</A>.
      </P>
    </article>
  ),
}

export default post
