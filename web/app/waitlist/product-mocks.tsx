/**
 * Stylized product mocks used on the waitlist landing page. These are not
 * real screenshots — they're hand-built UI fragments that match the look
 * and feel of the actual ChronoFlow dashboard. Replace with real product
 * captures when we have them.
 *
 * Every mock uses the cf-* design tokens so it adapts to light/dark theme
 * and stays consistent with the rest of the page.
 */

import {
  ArrowUp,
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Inbox,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react"

import { GmailLogo, JiraLogo, OutlookLogo } from "./brand-logos"

/* ----------------------------- atoms ----------------------------- */

function MockChrome({
  label,
  children,
  className = "",
}: {
  label?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`cf-card-glow overflow-hidden rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] ${className}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "#ff5f57" }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "#febc2e" }}
          />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: "#28c840" }}
          />
        </div>
        <span className="font-mono text-[11px] text-[var(--cf-text-dim)]">
          {label ?? "chronoflow"}
        </span>
        <div className="w-12" />
      </div>
      {children}
    </div>
  )
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold text-white"
      style={{ background: color }}
    >
      {initials}
    </span>
  )
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "accent" | "neutral" | "purple" | "green"
}) {
  const styles =
    tone === "accent"
      ? {
          background: "rgba(var(--cf-accent-rgb), 0.12)",
          color: "rgba(var(--cf-accent-rgb), 1)",
          border: "1px solid rgba(var(--cf-accent-rgb), 0.3)",
        }
      : tone === "purple"
        ? {
            background: "rgba(var(--cf-aux-rgb), 0.12)",
            color: "rgba(var(--cf-aux-rgb), 1)",
            border: "1px solid rgba(var(--cf-aux-rgb), 0.3)",
          }
        : tone === "green"
          ? {
              background: "rgba(34, 197, 94, 0.12)",
              color: "rgb(74, 222, 128)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }
          : {
              background: "var(--cf-bg-soft)",
              color: "var(--cf-text-muted)",
              border: "1px solid var(--cf-border-strong)",
            }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider"
      style={styles}
    >
      {children}
    </span>
  )
}

/* ---------------------------- 1. DashboardMock ---------------------------- */

export function DashboardMock() {
  return (
    <MockChrome label="dashboard · chronoflow">
      <div className="grid gap-3 p-3.5 sm:grid-cols-2 sm:p-4">
        {/* Today card */}
        <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              Today · Tue Mar 12
            </span>
            <Clock className="h-3.5 w-3.5 text-[var(--cf-text-dim)]" />
          </div>
          <ul className="mt-3 space-y-2">
            <li className="flex items-center gap-2.5 rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] px-2.5 py-1.5">
              <span
                className="h-7 w-1 shrink-0 rounded-full"
                style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[12.5px] text-[var(--cf-text)]">
                  Standup
                </p>
                <p className="font-mono text-[10.5px] text-[var(--cf-text-dim)]">
                  9:00 – 9:15 AM · Meeting
                </p>
              </div>
            </li>
            <li className="flex items-center gap-2.5 rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] px-2.5 py-1.5">
              <span
                className="h-7 w-1 shrink-0 rounded-full"
                style={{ background: "rgba(var(--cf-aux-rgb), 1)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[12.5px] text-[var(--cf-text)]">
                  Auth refactor — deep work
                </p>
                <p className="font-mono text-[10.5px] text-[var(--cf-text-dim)]">
                  9:30 – 11:00 AM · Focus block
                </p>
              </div>
            </li>
            <li className="flex items-center gap-2.5 rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] px-2.5 py-1.5">
              <span
                className="h-7 w-1 shrink-0 rounded-full"
                style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[12.5px] text-[var(--cf-text)]">
                  1:1 with Sarah
                </p>
                <p className="font-mono text-[10.5px] text-[var(--cf-text-dim)]">
                  2:00 – 2:30 PM · Meeting
                </p>
              </div>
            </li>
          </ul>
        </div>

        {/* Focus card */}
        <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              Focus · running
            </span>
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: "rgba(var(--cf-accent-rgb), 1)",
                boxShadow: "0 0 8px rgba(var(--cf-accent-rgb), 0.8)",
              }}
            />
          </div>
          <div className="mt-3 flex items-end gap-2.5">
            <span className="font-mono text-[34px] font-semibold leading-none text-[var(--cf-text)] tabular-nums">
              42:18
            </span>
            <span className="mb-1 font-mono text-[11px] text-[var(--cf-text-muted)]">
              of 90:00
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--cf-bg-soft)]">
            <div
              className="h-full"
              style={{
                width: "47%",
                background:
                  "linear-gradient(90deg, rgba(var(--cf-accent-rgb), 1), rgba(var(--cf-primary-rgb), 1))",
              }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <FocusStat label="This week" value="14h" />
            <FocusStat label="Streak" value="6 days" />
            <FocusStat label="Avg/day" value="2.1h" />
          </div>
        </div>

        {/* Tasks card */}
        <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              Tasks
            </span>
            <span className="font-mono text-[10.5px] text-[var(--cf-text-muted)]">
              5 todo · 3 in progress · 12 done
            </span>
          </div>
          <ul className="mt-3 space-y-1.5">
            <TaskRow
              title="Review PR #812 — token refresh"
              source="github"
              priority="high"
              done={false}
            />
            <TaskRow
              title="Reply to client about API delay"
              source="gmail"
              priority="medium"
              done={false}
            />
            <TaskRow
              title="ENG-1284 — login timeout on Safari"
              source="jira"
              priority="high"
              done={false}
            />
          </ul>
        </div>

        {/* Inbox card */}
        <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              Inbox · 24 unread
            </span>
            <Inbox className="h-3.5 w-3.5 text-[var(--cf-text-dim)]" />
          </div>
          <ul className="mt-3 space-y-1.5">
            <InboxRow
              from="Alex Rivera"
              subject="Re: Q2 roadmap review"
              source="gmail"
              unread
            />
            <InboxRow
              from="GitHub"
              subject="Pull request review requested: api#812"
              source="gmail"
              unread
            />
            <InboxRow
              from="Sarah Chen"
              subject="Notes from architecture sync"
              source="outlook"
            />
          </ul>
        </div>
      </div>

      {/* Insight footer */}
      <div className="flex items-center gap-2.5 border-t border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2.5">
        <Sparkles
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
        />
        <p className="font-mono text-[11.5px] text-[var(--cf-text-muted)]">
          You complete{" "}
          <span className="font-semibold text-[var(--cf-text)]">40% more tasks</span>{" "}
          on days with fewer than 3 meetings.
        </p>
      </div>
    </MockChrome>
  )
}

function FocusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] px-2 py-1.5">
      <p className="font-mono text-[9.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[12.5px] font-semibold text-[var(--cf-text)] tabular-nums">
        {value}
      </p>
    </div>
  )
}

function TaskRow({
  title,
  source,
  priority,
  done,
}: {
  title: string
  source: "github" | "gmail" | "jira" | "outlook" | "teams"
  priority: "low" | "medium" | "high"
  done: boolean
}) {
  const Icon = done ? CheckCircle2 : Circle
  const sourceLabel =
    source === "github"
      ? "github"
      : source === "gmail"
        ? "gmail"
        : source === "outlook"
          ? "outlook"
          : source === "teams"
            ? "teams"
            : "jira"
  return (
    <li className="flex items-center gap-2 rounded-md px-1 py-0.5">
      <Icon
        className="h-3.5 w-3.5 shrink-0"
        style={{
          color: done
            ? "rgba(var(--cf-accent-rgb), 1)"
            : "var(--cf-text-dim)",
        }}
      />
      <span
        className={`min-w-0 flex-1 truncate text-[12.5px] ${
          done
            ? "text-[var(--cf-text-dim)] line-through"
            : "text-[var(--cf-text)]"
        }`}
      >
        {title}
      </span>
      <Badge tone="neutral">{sourceLabel}</Badge>
      {priority === "high" && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "rgb(248, 113, 113)" }}
          aria-label="high priority"
        />
      )}
    </li>
  )
}

function InboxRow({
  from,
  subject,
  source,
  unread,
}: {
  from: string
  subject: string
  source: "gmail" | "outlook"
  unread?: boolean
}) {
  return (
    <li className="flex items-center gap-2 rounded-md px-1 py-0.5">
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {source === "gmail" ? (
          <GmailLogo className="!h-3.5 !w-3.5" />
        ) : (
          <OutlookLogo className="!h-3.5 !w-3.5" />
        )}
      </span>
      <span
        className={`shrink-0 text-[12.5px] ${
          unread
            ? "font-semibold text-[var(--cf-text)]"
            : "text-[var(--cf-text-muted)]"
        }`}
      >
        {from}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--cf-text-muted)]">
        — {subject}
      </span>
      {unread && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
        />
      )}
    </li>
  )
}

/* ---------------------------- 2. UnifiedMailMock ---------------------------- */

export function UnifiedMailMock() {
  const rows: Array<{
    from: string
    subject: string
    preview: string
    source: "gmail" | "outlook"
    time: string
    unread?: boolean
    starred?: boolean
  }> = [
    {
      from: "Alex Rivera",
      subject: "Re: Q2 roadmap review",
      preview: "Pulled together my notes from the sync — let me know what you…",
      source: "gmail",
      time: "9:42 AM",
      unread: true,
      starred: true,
    },
    {
      from: "GitHub",
      subject: "PR review requested · acme/api#812",
      preview: "Jake asked for a review on token refresh logic. 3 files changed.",
      source: "gmail",
      time: "9:30 AM",
      unread: true,
    },
    {
      from: "Sarah Chen",
      subject: "Notes from architecture sync",
      preview: "Wrote up what we landed on for the auth boundary. Thoughts?",
      source: "outlook",
      time: "Yesterday",
    },
    {
      from: "Stripe",
      subject: "Invoice paid · INV-04923",
      preview: "Your invoice for $1,200 has been processed.",
      source: "outlook",
      time: "Yesterday",
      starred: true,
    },
    {
      from: "Maya Patel",
      subject: "Launch checklist v3",
      preview: "Final pass on the checklist. Two open items I'd flag.",
      source: "gmail",
      time: "Mon",
    },
  ]

  return (
    <MockChrome label="mail · gmail + outlook">
      <ul className="divide-y divide-[var(--cf-border)]">
        {rows.map((r, i) => (
          <li
            key={i}
            className={`flex items-center gap-3 px-4 py-3 ${
              r.unread ? "bg-[var(--cf-bg)]" : ""
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {r.source === "gmail" ? <GmailLogo /> : <OutlookLogo />}
            </span>
            <Star
              className="h-3.5 w-3.5 shrink-0"
              style={{
                color: r.starred
                  ? "#fbbf24"
                  : "var(--cf-text-dim)",
              }}
              fill={r.starred ? "#fbbf24" : "transparent"}
            />
            <span
              className={`shrink-0 text-[13px] ${
                r.unread
                  ? "font-semibold text-[var(--cf-text)]"
                  : "text-[var(--cf-text-muted)]"
              }`}
            >
              {r.from}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`text-[13px] ${
                  r.unread
                    ? "font-semibold text-[var(--cf-text)]"
                    : "text-[var(--cf-text)]"
                }`}
              >
                {r.subject}
              </span>
              <span className="ml-2 text-[12.5px] text-[var(--cf-text-muted)]">
                {r.preview}
              </span>
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10.5px] text-[var(--cf-text-dim)]">
              {r.time}
            </span>
          </li>
        ))}
      </ul>
    </MockChrome>
  )
}

/* ------------------------- 3. TaskExtractionMock ------------------------- */

export function TaskExtractionMock() {
  return (
    <MockChrome label="ai task extraction">
      <div className="grid gap-3 p-3.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4 sm:p-5">
        {/* Left: emails */}
        <div className="space-y-2">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
            Inbox
          </p>
          <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-3">
            <div className="flex items-center gap-2">
              <GmailLogo className="!h-4 !w-4" />
              <span className="font-mono text-[11px] text-[var(--cf-text-muted)]">
                Alex Rivera · 9:42 AM
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] font-medium text-[var(--cf-text)]">
              Re: Q2 roadmap review
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--cf-text-muted)]">
              Can you review the staging deploy doc by{" "}
              <span className="rounded bg-[var(--cf-accent-soft)] px-1 text-[var(--cf-text)]">
                Friday
              </span>
              ? Also need an LGTM on the rollback plan.
            </p>
          </div>
          <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-3">
            <div className="flex items-center gap-2">
              <OutlookLogo className="!h-4 !w-4" />
              <span className="font-mono text-[11px] text-[var(--cf-text-muted)]">
                Maya Patel · Yesterday
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] font-medium text-[var(--cf-text)]">
              Launch checklist v3
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--cf-text-muted)]">
              Two open items —{" "}
              <span className="rounded bg-[var(--cf-accent-soft)] px-1 text-[var(--cf-text)]">
                file the analytics ticket
              </span>{" "}
              and confirm the customer announcement copy.
            </p>
          </div>
        </div>

        {/* Middle: arrow / AI */}
        <div className="flex items-center justify-center sm:flex-col sm:gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "rgba(var(--cf-accent-rgb), 0.12)",
              border: "1px solid rgba(var(--cf-accent-rgb), 0.35)",
              color: "rgba(var(--cf-accent-rgb), 1)",
            }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--cf-text-dim)]">
            extract
          </span>
        </div>

        {/* Right: tasks */}
        <div className="space-y-2">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
            Tasks created
          </p>
          <ExtractedTask
            title="Review staging deploy doc"
            source="gmail"
            due="Fri"
            priority="high"
            confidence={0.92}
          />
          <ExtractedTask
            title="LGTM on rollback plan"
            source="gmail"
            due="Fri"
            priority="medium"
            confidence={0.84}
          />
          <ExtractedTask
            title="File analytics ticket"
            source="outlook"
            due="Wed"
            priority="medium"
            confidence={0.78}
          />
        </div>
      </div>
    </MockChrome>
  )
}

function ExtractedTask({
  title,
  source,
  due,
  priority,
  confidence,
}: {
  title: string
  source: "gmail" | "outlook"
  due: string
  priority: "low" | "medium" | "high"
  confidence: number
}) {
  return (
    <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-2.5">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cf-text-dim)]" />
        <p className="flex-1 text-[12.5px] font-medium text-[var(--cf-text)]">
          {title}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge tone={source === "gmail" ? "neutral" : "neutral"}>{source}</Badge>
        <Badge tone={priority === "high" ? "accent" : "neutral"}>
          {priority} · due {due}
        </Badge>
        <span className="ml-auto font-mono text-[10px] text-[var(--cf-text-dim)]">
          {Math.round(confidence * 100)}%
        </span>
      </div>
    </div>
  )
}

/* ---------------------------- 4. CalendarMock ---------------------------- */

export function CalendarMock() {
  // Each event is { day (0=Mon...4=Fri), startHour, durationHours, title, type }
  const events: Array<{
    day: number
    start: number
    duration: number
    title: string
    type: "meeting" | "focus" | "task"
  }> = [
    { day: 0, start: 0, duration: 0.5, title: "Standup", type: "meeting" },
    { day: 0, start: 1, duration: 1.5, title: "Auth refactor", type: "focus" },
    { day: 0, start: 4, duration: 0.5, title: "1:1 Sarah", type: "meeting" },
    { day: 1, start: 0.5, duration: 1, title: "Code review", type: "task" },
    { day: 1, start: 2, duration: 2, title: "Deep work", type: "focus" },
    { day: 2, start: 0, duration: 1, title: "Standup + planning", type: "meeting" },
    { day: 2, start: 3, duration: 1.5, title: "API review", type: "meeting" },
    { day: 3, start: 1, duration: 2, title: "Migrations", type: "focus" },
    { day: 3, start: 4, duration: 1, title: "Customer call", type: "meeting" },
    { day: 4, start: 0.5, duration: 0.5, title: "Standup", type: "meeting" },
    { day: 4, start: 2, duration: 2.5, title: "Ship checklist", type: "focus" },
  ]

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const hours = ["9", "10", "11", "12", "1", "2"]

  const colorFor = (type: "meeting" | "focus" | "task") =>
    type === "focus"
      ? "rgba(var(--cf-aux-rgb), 1)"
      : type === "meeting"
        ? "rgba(var(--cf-accent-rgb), 1)"
        : "rgba(var(--cf-primary-rgb), 1)"

  return (
    <MockChrome label="calendar · week of Mar 11">
      <div className="p-3.5 sm:p-4">
        {/* Legend */}
        <div className="mb-3 flex flex-wrap items-center gap-3 font-mono text-[10.5px] text-[var(--cf-text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
            />
            Meetings
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "rgba(var(--cf-aux-rgb), 1)" }}
            />
            Focus blocks
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: "rgba(var(--cf-primary-rgb), 1)" }}
            />
            Tasks
          </span>
        </div>

        <div className="grid grid-cols-[28px_repeat(5,1fr)] gap-1">
          {/* Empty corner */}
          <div />
          {/* Day headers */}
          {days.map((d) => (
            <div
              key={d}
              className="font-mono text-center text-[10.5px] uppercase tracking-wider text-[var(--cf-text-muted)]"
            >
              {d}
            </div>
          ))}

          {/* Hours + day columns */}
          <div className="row-span-6 flex flex-col">
            {hours.map((h) => (
              <div
                key={h}
                className="flex h-12 items-start justify-end pr-1.5 font-mono text-[9.5px] text-[var(--cf-text-dim)]"
              >
                {h}
              </div>
            ))}
          </div>
          {days.map((_, dayIdx) => (
            <div
              key={dayIdx}
              className="relative row-span-6 rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg)]"
              style={{ height: "288px" }}
            >
              {/* hour grid lines */}
              {hours.slice(1).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-[var(--cf-border)] opacity-50"
                  style={{ top: `${((i + 1) * 100) / hours.length}%` }}
                />
              ))}
              {events
                .filter((e) => e.day === dayIdx)
                .map((e, i) => {
                  const top = (e.start / hours.length) * 100
                  const height = (e.duration / hours.length) * 100
                  return (
                    <div
                      key={i}
                      className="absolute inset-x-1 overflow-hidden rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] text-white"
                      style={{
                        top: `${top}%`,
                        height: `${height}%`,
                        background: colorFor(e.type),
                        boxShadow: `0 4px 14px -8px ${colorFor(e.type)}`,
                      }}
                      title={e.title}
                    >
                      <p className="truncate font-semibold leading-tight">
                        {e.title}
                      </p>
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      </div>
    </MockChrome>
  )
}

/* -------------------------- 5. TeamSchedulingMock -------------------------- */

export function TeamSchedulingMock() {
  const slots = 24 // 9 AM to 6 PM in 22.5-min slots → simplify to fixed length
  const teammates: Array<{
    name: string
    initials: string
    color: string
    busy: Array<[number, number]> // [start, end] in slot indices
  }> = [
    {
      name: "You",
      initials: "AK",
      color: "#06b6d4",
      busy: [
        [0, 2],
        [10, 12],
      ],
    },
    {
      name: "Alex Rivera",
      initials: "AR",
      color: "#8b5cf6",
      busy: [
        [4, 7],
        [14, 16],
      ],
    },
    {
      name: "Sarah Chen",
      initials: "SC",
      color: "#ec4899",
      busy: [
        [0, 4],
        [10, 13],
        [18, 20],
      ],
    },
    {
      name: "Maya Patel",
      initials: "MP",
      color: "#f59e0b",
      busy: [[0, 6], [16, 22]],
    },
  ]

  // common-free window: indices 7..10 → "11:00 AM – 12:00 PM"
  return (
    <MockChrome label="team scheduling · Thursday">
      <div className="p-3.5 sm:p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-[var(--cf-text-dim)]" />
            <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-muted)]">
              4 teammates · find a 30 min slot
            </span>
          </div>
          <span className="font-mono text-[10.5px] text-[var(--cf-text-dim)]">
            9 AM — 6 PM
          </span>
        </div>

        {/* Hour scale */}
        <div className="grid grid-cols-[88px_1fr] items-center gap-3">
          <div />
          <div className="flex justify-between font-mono text-[9.5px] text-[var(--cf-text-dim)]">
            <span>9</span>
            <span>11</span>
            <span>1</span>
            <span>3</span>
            <span>5</span>
          </div>

          {teammates.map((t) => (
            <FragmentRow key={t.name} t={t} slots={slots} />
          ))}
        </div>

        {/* Common slot callout */}
        <div className="mt-4 rounded-md border border-dashed border-[rgba(var(--cf-accent-rgb),0.5)] bg-[rgba(var(--cf-accent-rgb),0.06)] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles
                className="h-3.5 w-3.5"
                style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
              />
              <span className="text-[12.5px] font-medium text-[var(--cf-text)]">
                Everyone free · 11:00 AM – 12:00 PM
              </span>
            </div>
            <span
              className="rounded-md px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white"
              style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
            >
              Schedule
            </span>
          </div>
        </div>
      </div>
    </MockChrome>
  )
}

function FragmentRow({
  t,
  slots,
}: {
  t: {
    name: string
    initials: string
    color: string
    busy: Array<[number, number]>
  }
  slots: number
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <Avatar initials={t.initials} color={t.color} />
        <span className="truncate text-[12.5px] text-[var(--cf-text)]">
          {t.name}
        </span>
      </div>
      <div className="relative h-6 overflow-hidden rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg)]">
        {t.busy.map(([s, e], i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${(s / slots) * 100}%`,
              width: `${((e - s) / slots) * 100}%`,
              background: t.color,
              opacity: 0.65,
            }}
          />
        ))}
      </div>
    </>
  )
}

/* ---------------------------- 6. FocusTimeMock ---------------------------- */

export function FocusTimeMock() {
  const progress = 0.47
  const radius = 56
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <MockChrome label="focus · running">
      <div className="grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
        {/* Circular progress */}
        <div className="relative mx-auto h-36 w-36 sm:mx-0">
          <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="var(--cf-bg-soft)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              stroke="rgba(var(--cf-accent-rgb), 1)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                filter: "drop-shadow(0 0 8px rgba(var(--cf-accent-rgb), 0.6))",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-mono text-[26px] font-semibold leading-none text-[var(--cf-text)] tabular-nums">
              42:18
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              of 90:00
            </p>
          </div>
        </div>

        {/* Right side */}
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
            Current session
          </p>
          <p className="mt-1.5 text-[16px] font-semibold text-[var(--cf-text)]">
            Auth refactor — deep work
          </p>
          <p className="mt-1 text-[13px] text-[var(--cf-text-muted)]">
            Calendar block · do-not-disturb on · 47 min remaining
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <FocusStat label="This week" value="14h 12m" />
            <FocusStat label="Streak" value="6 days" />
          </div>
        </div>
      </div>

      {/* Preset bar */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-4 py-2.5">
        <span className="mr-1 font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
          Presets
        </span>
        {["25m", "50m", "90m", "120m", "Custom"].map((p, i) => (
          <span
            key={p}
            className="rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] px-2 py-0.5 font-mono text-[11px]"
            style={{
              color:
                i === 2
                  ? "rgba(var(--cf-accent-rgb), 1)"
                  : "var(--cf-text-muted)",
              borderColor:
                i === 2
                  ? "rgba(var(--cf-accent-rgb), 0.4)"
                  : "var(--cf-border)",
              background:
                i === 2 ? "var(--cf-accent-soft)" : "var(--cf-bg-elev)",
            }}
          >
            {p}
          </span>
        ))}
      </div>
    </MockChrome>
  )
}

/* ---------------------------- 7. AnalyticsMock ---------------------------- */

export function AnalyticsMock() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const focus = [3.5, 1.8, 4.2, 2.5, 3.8]
  const meetings = [2.5, 5.2, 2.0, 4.5, 3.0]
  const max = 6

  return (
    <MockChrome label="analytics · this week">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              Focus vs meeting hours
            </p>
            <p className="mt-1 text-[20px] font-semibold text-[var(--cf-text)] tabular-nums">
              15.8h{" "}
              <span className="text-[13px] font-normal text-[var(--cf-text-muted)]">
                focus
              </span>
              <span className="mx-2 text-[var(--cf-text-dim)]">·</span>
              17.2h{" "}
              <span className="text-[13px] font-normal text-[var(--cf-text-muted)]">
                meetings
              </span>
            </p>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px]"
            style={{
              background: "rgba(34, 197, 94, 0.12)",
              color: "rgb(74, 222, 128)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            <TrendingUp className="h-3 w-3" /> +12% vs last week
          </span>
        </div>

        {/* Bars */}
        <div className="mt-5 grid grid-cols-5 gap-3">
          {days.map((d, i) => (
            <div key={d} className="flex flex-col items-stretch gap-1.5">
              <div className="relative flex h-32 items-end gap-1">
                <div
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${(focus[i] / max) * 100}%`,
                    background:
                      "linear-gradient(180deg, rgba(var(--cf-aux-rgb), 1) 0%, rgba(var(--cf-aux-rgb), 0.6) 100%)",
                  }}
                />
                <div
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${(meetings[i] / max) * 100}%`,
                    background:
                      "linear-gradient(180deg, rgba(var(--cf-accent-rgb), 1) 0%, rgba(var(--cf-accent-rgb), 0.6) 100%)",
                  }}
                />
              </div>
              <p className="text-center font-mono text-[10px] uppercase tracking-wider text-[var(--cf-text-dim)]">
                {d}
              </p>
            </div>
          ))}
        </div>

        {/* Insight callout */}
        <div className="mt-5 flex items-start gap-2.5 rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-3">
          <Sparkles
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
          />
          <p className="text-[12.5px] leading-relaxed text-[var(--cf-text-muted)]">
            <span className="font-semibold text-[var(--cf-text)]">
              Tuesday and Thursday
            </span>{" "}
            are your peak focus days. Consider blocking deep work earlier on
            those mornings — your completion rate is 38% higher.
          </p>
        </div>
      </div>
    </MockChrome>
  )
}

/* ----------------------------- 8. AskMock ----------------------------- */

export function AskMock() {
  return (
    <MockChrome label="ask chronoflow">
      <div className="flex flex-col gap-3 p-3.5 sm:p-4">
        {/* User prompt */}
        <div className="flex justify-end">
          <div
            className="max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] leading-relaxed text-white"
            style={{
              background:
                "linear-gradient(135deg, rgba(var(--cf-accent-rgb), 1), rgba(var(--cf-primary-rgb), 1))",
              boxShadow: "0 4px 18px -8px rgba(var(--cf-accent-rgb), 0.6)",
            }}
          >
            Create a P1 Jira ticket for the login timeout on Safari, and reply
            to Alex saying I&apos;ll review the rollback plan by Friday.
          </div>
        </div>

        {/* Assistant header */}
        <div className="flex items-start gap-2.5">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "rgba(var(--cf-accent-rgb), 0.12)",
              border: "1px solid rgba(var(--cf-accent-rgb), 0.35)",
              color: "rgba(var(--cf-accent-rgb), 1)",
            }}
          >
            <Bot className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[13px] leading-relaxed text-[var(--cf-text-muted)]">
              On it. Filing the ticket and drafting the reply now — both will
              ask for confirmation before they go out.
            </p>

            {/* Tool call: Jira */}
            <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <JiraLogo className="!h-4 !w-4" />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
                  Jira · ticket created
                </span>
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10.5px] text-[rgb(74,222,128)]">
                  <CheckCircle2 className="h-3 w-3" />
                  done
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-[var(--cf-text)]">
                  ENG-1284
                </span>
                <span className="truncate text-[12.5px] text-[var(--cf-text)]">
                  Login times out on Safari after 60s idle
                </span>
                <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-[var(--cf-text-dim)]" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone="accent">P1 · high</Badge>
                <Badge tone="neutral">assigned to you</Badge>
                <Badge tone="neutral">sprint 24</Badge>
              </div>
            </div>

            {/* Tool call: Email draft */}
            <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <GmailLogo className="!h-4 !w-4" />
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-dim)]">
                  Gmail · draft ready
                </span>
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10.5px] text-[rgba(var(--cf-accent-rgb),1)]">
                  <Sparkles className="h-3 w-3" />
                  awaiting send
                </span>
              </div>
              <div className="mt-2 space-y-1">
                <p className="font-mono text-[10.5px] text-[var(--cf-text-dim)]">
                  To: alex@acme.dev · Re: Q2 roadmap review
                </p>
                <p className="text-[12.5px] leading-relaxed text-[var(--cf-text-muted)]">
                  Hey Alex — taking a look now, I&apos;ll have feedback on the
                  rollback plan by{" "}
                  <span className="rounded bg-[var(--cf-accent-soft)] px-1 text-[var(--cf-text)]">
                    Friday EOD
                  </span>
                  . Flagging anything blocking before then.
                </p>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className="rounded-md px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-white"
                  style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
                >
                  Send
                </span>
                <span className="rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wider text-[var(--cf-text-muted)]">
                  Edit
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Faux input bar */}
      <div className="flex items-center gap-2 border-t border-[var(--cf-border)] bg-[var(--cf-bg-soft)] px-3.5 py-2.5">
        <Sparkles
          className="h-3.5 w-3.5 shrink-0"
          style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
        />
        <span className="flex-1 truncate font-mono text-[12px] text-[var(--cf-text-dim)]">
          Ask anything — schedule, draft, summarize, file a ticket…
        </span>
        <span
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: "rgba(var(--cf-accent-rgb), 1)",
            color: "white",
            boxShadow: "0 0 14px -4px rgba(var(--cf-accent-rgb), 0.7)",
          }}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </span>
      </div>
    </MockChrome>
  )
}
