import { ArrowRight, Zap } from "lucide-react"

import {
  GmailLogo,
  GoogleCalendarLogo,
  JiraLogo,
  SlackLogo,
} from "./brand-logos"
import { ScrollReveal } from "./scroll-reveal"

type Scenario = {
  id: "slack" | "gmail" | "jira" | "calendar"
  what: string
  outcome: string
  Logo: typeof SlackLogo
}

const TOOL_LABELS: Record<Scenario["id"], string> = {
  slack: "Slack",
  gmail: "Gmail",
  jira: "Jira",
  calendar: "Google Calendar",
}

const SCENARIOS: Scenario[] = [
  {
    id: "slack",
    Logo: SlackLogo,
    what: "A PR review request lands at 4pm.",
    outcome: "You'll do it after lunch tomorrow. You don't.",
  },
  {
    id: "gmail",
    Logo: GmailLogo,
    what: "A client deadline is buried mid-thread.",
    outcome: "You see it on Friday. The deadline was Thursday.",
  },
  {
    id: "jira",
    Logo: JiraLogo,
    what: "A ticket gets assigned to you in standup.",
    outcome: "You never open Jira that day. It's still 'To Do' next sprint.",
  },
  {
    id: "calendar",
    Logo: GoogleCalendarLogo,
    what: "A meeting drops on top of your focus block.",
    outcome: "Your deep-work morning is gone before you notice.",
  },
]

function ProblemCard({ scenario, index }: { scenario: Scenario; index: number }) {
  const { Logo } = scenario

  return (
    <ScrollReveal delay={80 + index * 60}>
      <article
        className="cf-problem-card"
        data-tool={scenario.id}
        aria-label={`${TOOL_LABELS[scenario.id]}: ${scenario.what}`}
      >
        <div className="cf-problem-card-accent" aria-hidden />
        <div className="cf-problem-card-inner">
          <div className="cf-problem-logo-chip">
            <Logo className="h-6 w-6" />
          </div>
          <p className="sr-only">{TOOL_LABELS[scenario.id]}</p>
          <p className="cf-problem-setup">{scenario.what}</p>
          <div className="cf-problem-arrow" aria-hidden>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
          <p className="cf-problem-outcome">{scenario.outcome}</p>
        </div>
      </article>
    </ScrollReveal>
  )
}

function GapBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3.5 py-1.5 ${className}`}
    >
      <Zap className="h-3.5 w-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
      <span className="font-mono text-[12.5px] text-[var(--cf-text)]">
        ChronoFlow lives in those gaps.
      </span>
    </div>
  )
}

export function ProblemScroll() {
  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="cf-problem-layout mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="cf-problem-intro">
          <ScrollReveal>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[rgba(var(--cf-accent-rgb),1)]">
              Why this exists
            </p>
          </ScrollReveal>
          <ScrollReveal delay={60}>
            <h2 className="mt-5 text-balance text-2xl leading-snug text-[var(--cf-text)] sm:text-[28px] sm:leading-tight">
              Every engineer reading this knows the pattern.{" "}
              <span className="text-[var(--cf-text-muted)]">
                It&apos;s not that you&apos;re disorganized. It&apos;s that work shows up in one
                tool and the action needs to happen in a different one.
              </span>
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <blockquote className="cf-personal-note mt-8 text-left">
              <p className="text-[15px] leading-relaxed text-[var(--cf-text-muted)]">
                I kept missing tasks — not because I wasn&apos;t trying. A review request
                would land in Teams, a deadline would hide in email, a ticket would get
                assigned in Jira. Each lived in a different app, and nothing connected
                them. I built ChronoFlow to fix that.
              </p>
            </blockquote>
          </ScrollReveal>
          <ScrollReveal delay={140}>
            <GapBadge className="mt-8 hidden lg:inline-flex" />
          </ScrollReveal>
        </div>

        <div className="cf-problem-grid mt-10 lg:mt-0">
          {SCENARIOS.map((scenario, i) => (
            <ProblemCard key={scenario.id} scenario={scenario} index={i} />
          ))}
        </div>

        <ScrollReveal delay={200}>
          <GapBadge className="mt-10 lg:hidden" />
        </ScrollReveal>
      </div>
    </section>
  )
}
