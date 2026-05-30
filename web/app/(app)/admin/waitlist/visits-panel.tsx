import { Eye, TrendingUp } from "lucide-react"

import {
  getVisitStats,
  type DailyBucket,
  type PathBreakdown,
  type SourceBreakdown,
  type VisitTotals,
} from "@/lib/visit-tracking"

export async function VisitsPanel() {
  let stats: Awaited<ReturnType<typeof getVisitStats>> | null = null
  let loadError: string | null = null
  try {
    stats = await getVisitStats()
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Failed to load visit stats. Has the migration been applied?"
  }

  return (
    <div className="mt-10">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--cf-text-muted)]">
          Page visits
        </h2>
        <span className="font-mono text-[11px] text-[var(--cf-text-dim)]">
          PageVisit · last 30 days
        </span>
      </div>

      {loadError && (
        <div className="mt-3 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-4 text-xs text-[var(--cf-text-muted)]">
          <p className="font-medium text-[var(--cf-text)]">Couldn&apos;t load stats.</p>
          <p className="mt-1 font-mono">{loadError}</p>
        </div>
      )}

      {stats && (
        <>
          <TotalsRow totals={stats.totals} />
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-start">
            <DailyChart daily={stats.daily} />
            <TopPathsTable paths={stats.topPaths} />
            <TopSourcesTable sources={stats.topSources} />
          </div>
          <p className="mt-3 text-[11px] text-[var(--cf-text-dim)]">
            All public page visits are recorded (UTM-tagged or direct). Set a{" "}
            <code className="font-mono">cf_no_track=1</code> cookie in your browser to
            exclude your own browsing. Unique visitors use a daily-rotating IP hash.
          </p>
        </>
      )}
    </div>
  )
}

function TotalsRow({ totals }: { totals: VisitTotals }) {
  const items: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: "Last 7 days",
      value: totals.total7d.toLocaleString(),
      sub: `${totals.uniqueVisitors7d.toLocaleString()} unique`,
    },
    {
      label: "Last 30 days",
      value: totals.total30d.toLocaleString(),
      sub: `${totals.uniqueVisitors30d.toLocaleString()} unique`,
    },
    {
      label: "All time",
      value: totals.totalAllTime.toLocaleString(),
    },
  ]

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-4"
        >
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
            {item.label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[var(--cf-text)]">
            {item.value}
          </p>
          {item.sub && (
            <p className="mt-0.5 font-mono text-[11px] text-[var(--cf-text-muted)]">
              {item.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function TopPathsTable({ paths }: { paths: PathBreakdown[] }) {
  if (paths.length === 0) {
    return (
      <div className="w-full min-w-[240px] rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-4 lg:w-auto">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-dim)]">
          Top pages
        </h3>
        <p className="mt-3 text-sm text-[var(--cf-text-muted)]">No visits yet.</p>
      </div>
    )
  }

  const max = Math.max(...paths.map((p) => p.count), 1)

  return (
    <div className="w-full min-w-[240px] overflow-hidden rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] lg:w-[280px]">
      <div className="flex items-center gap-2 border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2.5">
        <Eye className="size-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
          Top pages · 30d
        </h3>
      </div>
      <ul className="divide-y divide-[var(--cf-border)]">
        {paths.map((p) => {
          const widthPct = Math.max(4, Math.round((p.count / max) * 100))
          return (
            <li key={p.path} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[12px] text-[var(--cf-text)]">
                  {p.path}
                </span>
                <span className="shrink-0 font-mono text-[12px] text-[var(--cf-text-muted)] tabular-nums">
                  {p.count}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--cf-bg-soft)]">
                <div
                  className="h-full rounded-full bg-[rgba(var(--cf-primary-rgb),0.55)]"
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

function TopSourcesTable({ sources }: { sources: SourceBreakdown[] }) {
  if (sources.length === 0) {
    return (
      <div className="w-full min-w-[280px] rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-4 lg:w-auto">
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-dim)]">
          Top sources
        </h3>
        <p className="mt-3 text-sm text-[var(--cf-text-muted)]">No visits yet.</p>
      </div>
    )
  }

  const max = Math.max(...sources.map((s) => s.count), 1)

  return (
    <div className="w-full min-w-[280px] overflow-hidden rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] lg:w-[320px]">
      <div className="flex items-center gap-2 border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2.5">
        <TrendingUp className="size-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
          Top sources · 30d
        </h3>
      </div>
      <ul className="divide-y divide-[var(--cf-border)]">
        {sources.map((s) => {
          const widthPct = Math.max(4, Math.round((s.count / max) * 100))
          return (
            <li key={s.source} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-[12.5px] text-[var(--cf-text)]">
                  {s.source}
                </span>
                <span className="shrink-0 font-mono text-[12px] text-[var(--cf-text-muted)] tabular-nums">
                  {s.count.toLocaleString()}{" "}
                  <span className="text-[var(--cf-text-dim)]">
                    · {s.uniqueVisitors.toLocaleString()} uniq
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--cf-bg-soft)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${widthPct}%`,
                    background:
                      "linear-gradient(90deg, rgba(var(--cf-accent-rgb), 1), rgba(var(--cf-primary-rgb), 1))",
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function DailyChart({ daily }: { daily: DailyBucket[] }) {
  const max = Math.max(...daily.map((d) => d.count), 1)
  const totalShown = daily.reduce((acc, d) => acc + d.count, 0)

  return (
    <div className="rounded-xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-4">
      <div className="flex items-center gap-2">
        <Eye className="size-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
        <h3 className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
          Daily visits · 30d ({totalShown.toLocaleString()} total)
        </h3>
      </div>

      <div
        className="mt-4 flex h-32 items-end gap-[3px]"
        role="img"
        aria-label={`Daily visits over the last 30 days, peak ${max} visits`}
      >
        {daily.map((d) => {
          const heightPct = Math.max(2, Math.round((d.count / max) * 100))
          const isToday = d.day === daily[daily.length - 1]?.day
          return (
            <div
              key={d.day}
              className="group relative flex-1 cursor-default"
              title={`${d.day}: ${d.count} visits, ${d.uniqueVisitors} unique`}
            >
              <div
                className="w-full rounded-t-sm transition-opacity group-hover:opacity-80"
                style={{
                  height: `${heightPct}%`,
                  background: isToday
                    ? "linear-gradient(180deg, rgba(var(--cf-accent-rgb), 1), rgba(var(--cf-primary-rgb), 0.7))"
                    : "rgba(var(--cf-accent-rgb), 0.55)",
                }}
              />
            </div>
          )
        })}
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[var(--cf-text-dim)]">
        <span>{daily[0]?.day ?? ""}</span>
        <span>today</span>
      </div>
    </div>
  )
}
