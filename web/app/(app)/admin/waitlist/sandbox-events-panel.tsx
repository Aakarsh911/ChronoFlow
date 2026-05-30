import { FlaskConical, MousePointerClick } from "lucide-react"

import { getSandboxEventStats } from "@/lib/event-tracking"

export async function SandboxEventsPanel() {
  let stats: Awaited<ReturnType<typeof getSandboxEventStats>> | null = null
  let loadError: string | null = null
  try {
    stats = await getSandboxEventStats()
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Failed to load sandbox stats. Has the ProductEvent migration been applied?"
  }

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cf-text-muted)]">
          Sandbox activity
        </h2>
        <span className="font-mono text-[11px] text-[var(--cf-text-dim)]">
          ProductEvent · last 30 days
        </span>
      </div>

      {loadError && (
        <div className="mt-3 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-4 text-xs text-[var(--cf-text-muted)]">
          <p className="font-medium text-[var(--cf-text)]">Couldn&apos;t load sandbox stats.</p>
          <p className="mt-1 font-mono">{loadError}</p>
        </div>
      )}

      {stats && (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            {[
              { label: "Events · 7d", value: stats.total7d },
              { label: "Events · 30d", value: stats.total30d },
              { label: "Sessions · 7d", value: stats.uniqueSessions7d },
              { label: "Sessions · 30d", value: stats.uniqueSessions30d },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-4"
              >
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
                  {item.label}
                </p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--cf-text)]">
                  {item.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <TopEventsTable events={stats.topEvents} />
            <RecentSessionsTable sessions={stats.recentSessions} />
          </div>

          <p className="mt-3 text-[11px] text-[var(--cf-text-dim)]">
            Tracks anonymous sandbox sessions — views, task toggles, AI prompts, focus
            timer, waitlist opens, and exit-intent modals. Set{" "}
            <code className="font-mono">cf_no_track=1</code> cookie to opt out of
            first-party tracking.
          </p>
        </>
      )}
    </div>
  )
}

function TopEventsTable({
  events,
}: {
  events: Awaited<ReturnType<typeof getSandboxEventStats>>["topEvents"]
}) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-4">
        <h3 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-dim)]">
          <MousePointerClick className="size-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
          Top events · 30d
        </h3>
        <p className="mt-3 text-sm text-[var(--cf-text-muted)]">
          No sandbox events yet. Share <code className="font-mono">/sandbox</code> from
          the waitlist page.
        </p>
      </div>
    )
  }

  const max = Math.max(...events.map((e) => e.count), 1)

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)]">
      <div className="flex items-center gap-2 border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2.5">
        <MousePointerClick className="size-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
          Top events · 30d
        </h3>
      </div>
      <ul className="divide-y divide-[var(--cf-border)]">
        {events.map((e) => {
          const widthPct = Math.max(4, Math.round((e.count / max) * 100))
          return (
            <li key={e.event} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[12px] text-[var(--cf-text)]">
                  {e.event}
                </span>
                <span className="shrink-0 font-mono text-[12px] text-[var(--cf-text-muted)] tabular-nums">
                  {e.count} · {e.uniqueSessions} sess
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--cf-bg-soft)]">
                <div
                  className="h-full rounded-full bg-[rgba(var(--cf-accent-rgb),0.65)]"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RecentSessionsTable({
  sessions,
}: {
  sessions: Awaited<ReturnType<typeof getSandboxEventStats>>["recentSessions"]
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)]">
      <div className="flex items-center gap-2 border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2.5">
        <FlaskConical className="size-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
          Recent sessions · 30d
        </h3>
      </div>
      {sessions.length === 0 ? (
        <p className="p-4 text-sm text-[var(--cf-text-muted)]">No sessions yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--cf-border)]">
          {sessions.map((s) => (
            <li key={s.sessionId + s.lastSeen} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12px] text-[var(--cf-text)]">
                  {s.sessionId}
                </span>
                <span className="font-mono text-[11px] text-[var(--cf-text-dim)]">
                  {s.eventCount} events
                </span>
              </div>
              {s.features.length > 0 && (
                <p className="mt-1 font-mono text-[10.5px] text-[var(--cf-text-muted)]">
                  Tried: {s.features.join(", ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
