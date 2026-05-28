import type { BlogPost } from "@/lib/blog"
import { Codeblock, H2, H3, P, A, Callout } from "@/components/blog/prose"

const post: BlogPost = {
  slug: "syncing-google-and-microsoft-calendars-programmatically",
  title: "Syncing Google Calendar and Microsoft Outlook in One View",
  description:
    "A practical guide to incremental calendar sync across Google and Microsoft — sync tokens, delta queries, and the normalization layer every unified calendar needs.",
  date: "2025-05-27",
  tags: ["calendar", "google-calendar", "microsoft-outlook", "productivity", "engineering"],
  author: "ChronoFlow Team",
  readTime: "7 min",
  sections: [
    { id: "problem", title: "Why one calendar view is hard" },
    { id: "auth", title: "OAuth without over-scoping" },
    { id: "google-sync", title: "Google incremental sync" },
    { id: "microsoft-sync", title: "Microsoft delta queries" },
    { id: "normalizing", title: "One event shape" },
    { id: "lessons", title: "What actually breaks" },
  ],
  content: () => (
    <article>
      <P>
        Most engineering teams are not purely Google or purely Microsoft. One person lives in Gmail
        Calendar, another in Outlook, and scheduling a four-person meeting means tab-hopping and
        mental timezone math. A unified calendar view sounds simple until you try to keep it accurate
        without hammering two different APIs all day.
      </P>
      <P>
        At ChronoFlow, we pull Google Calendar and Microsoft Outlook into one workspace. The hard
        part is not fetching events once — it is staying in sync incrementally, handling deletes,
        and making both providers look the same to everything downstream. This post explains the
        patterns we use, at the level of public API docs, not our internal implementation.
      </P>

      <H2 id="problem">Why one calendar view is hard</H2>
      <P>
        Google and Microsoft expose different JSON shapes, pagination models, and change-tracking
        mechanisms. Google uses <strong>sync tokens</strong>; Microsoft Graph uses{" "}
        <strong>delta links</strong>. All-day events, time zones, and deleted meetings are
        represented differently. If you normalize poorly, you get duplicate events, stale blocks,
        or meetings that disappear silently.
      </P>
      <Callout type="tip">
        The goal is not a one-time import. Users expect their calendar in your app to match Google
        or Outlook within seconds of a change — that requires incremental sync from day one.
      </Callout>

      <H2 id="auth">OAuth without over-scoping</H2>
      <P>
        Calendar sync starts with OAuth. The mistake most teams make is requesting every scope the
        product might ever need on first connect. Users read the consent screen carefully; a wall of
        permissions kills trust.
      </P>
      <P>
        For calendar-only features, request calendar read (and write only if you create events).
        For Google, that means the Calendar API scope plus offline access so you receive a refresh
        token. For Microsoft, include <code>offline_access</code> and calendar read scopes — without
        it, access tokens expire in about an hour and the integration silently breaks.
      </P>
      <P>
        Store tokens per user and per provider. Encrypt at rest, rotate refresh tokens when the
        provider re-issues them, and surface a clear “Reconnect account” state when refresh fails —
        especially for Microsoft accounts that can go inactive for long periods.
      </P>

      <H2 id="google-sync">Google incremental sync</H2>
      <P>
        Google Calendar supports incremental sync via a <code>syncToken</code>. On the first fetch,
        you list events in a window and Google returns a <code>nextSyncToken</code>. On later runs,
        pass that token back and Google returns only what changed.
      </P>
      <Codeblock language="typescript">{`// Pseudocode — first sync
const response = await calendar.events.list({
  calendarId,
  timeMin,
  timeMax,
  singleEvents: true,
  orderBy: "startTime",
})

const syncToken = response.data.nextSyncToken
// persist syncToken for this user + calendar

// Later — incremental sync
const changes = await calendar.events.list({
  calendarId,
  syncToken: savedSyncToken,
  singleEvents: true,
})`}</Codeblock>
      <P>
        The footgun: sync tokens expire. If a calendar has not been synced in a while, Google may
        respond with <code>410 Gone</code>. Your code should catch that, discard the stale token,
        and run a full sync to obtain a fresh one. Without this fallback, users see frozen calendars
        after a vacation.
      </P>

      <H2 id="microsoft-sync">Microsoft delta queries</H2>
      <P>
        Microsoft Graph uses <strong>delta queries</strong>. The first call hits a delta endpoint;
        the response includes an <code>@odata.deltaLink</code> URL. On the next sync, call that URL
        directly — you receive only changes since the last run.
      </P>
      <H3>Gotchas worth planning for</H3>
      <P>
        <strong>Pagination:</strong> the delta link may appear only on the last page of a multi-page
        first sync. Grab it too early and you miss events.
      </P>
      <P>
        <strong>Deletes:</strong> removed events often come back as minimal objects with an{" "}
        <code>@removed</code> flag, not a full event body. Your sync loop must delete locally when
        you see that flag.
      </P>
      <P>
        <strong>Time zones:</strong> request UTC (via the <code>Prefer: outlook.timezone="UTC"</code>{" "}
        header) so you are not parsing ambiguous local offsets from each mailbox.
      </P>

      <H2 id="normalizing">One event shape for both providers</H2>
      <P>
        Define an internal event model with fields your product actually uses: title, start, end,
        all-day flag, location, attendees, and a stable external ID. Map Google&apos;s{" "}
        <code>summary</code> and Microsoft&apos;s <code>subject</code> to the same field. Map{" "}
        <code>htmlLink</code> and <code>webLink</code> to one “open in provider” URL.
      </P>
      <P>
        Use a composite unique key — user, provider, external event ID — so upserts are idempotent.
        Sync jobs overlap, webhooks retry, and users refresh aggressively; duplicates are inevitable
        unless the database enforces uniqueness.
      </P>

      <H2 id="lessons">What actually breaks in production</H2>
      <P>
        <strong>Rate limits are asymmetric.</strong> Google Calendar quotas are generous for most
        apps; Microsoft Graph is stricter during bulk initial syncs. Back off on <code>429</code>{" "}
        responses and avoid syncing every calendar in parallel on first connect.
      </P>
      <P>
        <strong>Refresh tokens need UX.</strong> When Microsoft refresh fails with{" "}
        <code>invalid_grant</code>, do not fail silently. Show a reconnect prompt before the user
        notices missing meetings.
      </P>
      <P>
        <strong>Incremental sync is worth the complexity.</strong> Moving from full re-fetch to
        sync tokens and delta links dramatically cuts API volume for active users and makes the
        calendar feel live instead of “synced five minutes ago.”
      </P>

      <P className="mt-10 border-t border-[var(--cf-border)] pt-8 text-[var(--cf-text-muted)]">
        ChronoFlow ships a unified Google + Outlook calendar for engineering teams. Compare us to{" "}
        <A href="/alternatives/motion">Motion</A>, <A href="/alternatives/reclaim">Reclaim</A>, and{" "}
        <A href="/alternatives/clockwise">Clockwise</A>, or{" "}
        <A href="/waitlist">join the beta waitlist</A>.
      </P>
    </article>
  ),
}

export default post
