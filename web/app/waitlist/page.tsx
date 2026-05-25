import { promises as fs } from "fs"
import path from "path"
import Link from "next/link"
import {
  ArrowRight,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Mail,
  Mic,
  Quote,
  Server,
  Smartphone,
  Sparkles,
  Terminal,
  Wallet,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react"

import { AIOrb } from "./ai-orb"
import { AnimatedCount } from "./animated-count"
import {
  GitHubLogo,
  GmailLogo,
  GoogleCalendarLogo,
  JiraLogo,
  LinearLogo,
  NotionLogo,
  SlackLogo,
  TeamsLogo,
} from "./brand-logos"
import { HeroTerminal } from "./hero-terminal"
import { ScrollReveal } from "./scroll-reveal"
import { ThemeToggle } from "./theme-toggle"
import { WaitlistForm } from "./waitlist-form"

export const dynamic = "force-dynamic"

async function getWaitlistCount(): Promise<number> {
  try {
    const file = path.join(process.cwd(), "data", "waitlist.json")
    const raw = await fs.readFile(file, "utf8")
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

export default async function WaitlistPage() {
  const initialCount = await getWaitlistCount()

  return (
    <main className="relative overflow-x-clip">
      {/* Global aurora field — kept behind everything, masked at the top */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1100px]" aria-hidden>
        <div className="cf-aurora-field absolute inset-0">
          <div className="cf-aurora cf-aurora-a" />
          <div className="cf-aurora cf-aurora-b" />
          <div className="cf-aurora cf-aurora-c" />
        </div>
        <div className="absolute inset-0 cf-glow" />
        <div className="absolute inset-0 cf-grid" />
      </div>

      <SiteHeader />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <Examples />
      <Integrations />
      <Roadmap />
      <WhyChronoFlow />
      <Manifesto />
      <FinalCTA initialCount={initialCount} />
      <SiteFooter />
    </main>
  )
}

/* -------------------------- Section components -------------------------- */

function SiteHeader() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/waitlist" className="flex items-center gap-2" aria-label="ChronoFlow home">
          <Logo />
          <span className="font-mono text-sm font-semibold tracking-tight text-[var(--cf-text)]">
            chronoflow
          </span>
          <span className="cf-chip-accent rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
            beta
          </span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-2 text-sm">
          <ThemeToggle />
          <a
            href="#waitlist"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3 py-1.5 font-mono text-[12px] text-[var(--cf-text)] transition hover:border-[rgba(var(--cf-accent-rgb),0.5)]"
          >
            Join waitlist
            <ArrowRight className="h-3 w-3" />
          </a>
        </nav>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section
      id="waitlist"
      className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8 sm:pb-24 sm:pt-16"
    >
      <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
        <div>
          <ScrollReveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
              <Sparkles className="h-3 w-3 text-[rgba(var(--cf-accent-rgb),1)]" />
              <span>Private beta · invites rolling</span>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={60}>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--cf-text)] sm:text-5xl lg:text-[58px]">
              Say it.{" "}
              <span className="cf-gradient-text inline-block">It&apos;s done.</span>
            </h1>
          </ScrollReveal>

          <ScrollReveal delay={120}>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--cf-text-muted)] sm:text-lg">
              ChronoFlow is an AI teammate for software engineers. Schedule meetings, file
              tickets, ship reminders, and reply to messages — across your tools, from one
              voice or text command.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={180}>
            <div className="mt-7 max-w-lg">
              <WaitlistForm variant="hero" source="hero" />
              <p className="mt-3 font-mono text-[12px] text-[var(--cf-text-dim)]">
                Free for early adopters. No credit card. No spam.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={240}>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[12px] text-[var(--cf-text-dim)]">
              <span className="inline-flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5" /> Voice or text
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> Personal OAuth
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" /> Open-source core soon
              </span>
            </div>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={120} className="relative">
          <div
            className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(var(--cf-accent-rgb), 0.18), transparent 60%)",
            }}
          />
          <HeroTerminal />
        </ScrollReveal>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="relative z-10 overflow-hidden border-t border-[var(--cf-border)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[420px_1fr] lg:items-center lg:gap-16">
        <ScrollReveal className="order-2 lg:order-1">
          <div className="relative mx-auto">
            <AIOrb className="" />
            <FloatingChip label="Slack" top="2%" left="6%" delay={0} />
            <FloatingChip label="GitHub" top="10%" right="0%" delay={0.8} />
            <FloatingChip label="Jira" bottom="14%" left="0%" delay={1.4} />
            <FloatingChip label="Gmail" bottom="4%" right="8%" delay={2.0} />
          </div>
        </ScrollReveal>

        <div className="order-1 lg:order-2">
          <ScrollReveal>
            <Eyebrow>The problem</Eyebrow>
          </ScrollReveal>
          <ScrollReveal delay={60}>
            <p className="mt-5 text-balance text-2xl leading-snug text-[var(--cf-text)] sm:text-3xl sm:leading-tight">
              You get a Slack ping asking for a PR review. You think{" "}
              <span className="text-[var(--cf-text-muted)]">
                &ldquo;I&apos;ll do it after lunch.&rdquo;
              </span>{" "}
              You <span className="cf-strike">never do</span>.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={120}>
            <p className="mt-5 text-[16.5px] leading-relaxed text-[var(--cf-text-muted)]">
              Not because you don&apos;t care — because the request was in{" "}
              <span className="cf-highlight">Slack</span> and the action is in{" "}
              <span className="cf-highlight">GitHub</span>. Tasks die in the gap between
              your tools.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={180}>
            <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3.5 py-1.5">
              <Zap className="h-3.5 w-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
              <span className="font-mono text-[12.5px] text-[var(--cf-text)]">
                ChronoFlow lives in that gap.
              </span>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}

function FloatingChip({
  label,
  top,
  left,
  right,
  bottom,
  delay = 0,
}: {
  label: string
  top?: string
  left?: string
  right?: string
  bottom?: string
  delay?: number
}) {
  return (
    <div
      aria-hidden
      className="absolute hidden items-center gap-1.5 rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)]/90 px-2.5 py-1 font-mono text-[11px] text-[var(--cf-text-muted)] backdrop-blur md:inline-flex"
      style={{
        top,
        left,
        right,
        bottom,
        animation: `cf-float-chip 7s ease-in-out ${delay}s infinite`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: "rgba(var(--cf-accent-rgb), 1)",
          boxShadow: "0 0 8px rgba(var(--cf-accent-rgb), 0.8)",
        }}
      />
      {label}
      <style>{`
        @keyframes cf-float-chip {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="cf-float-chip"] { animation: none !important; }
        }
      `}</style>
    </div>
  )
}

function HowItWorks() {
  const steps: Array<{
    n: string
    title: string
    body: string
    bubble: { you: string; cf: { action: string; tool: string; detail: string } }
  }> = [
    {
      n: "01",
      title: "Connect your tools",
      body: "Google Calendar, Gmail, and GitHub today. More joining soon — no admin permissions needed.",
      bubble: {
        you: "Connect Google Calendar",
        cf: { action: "Calendar connected", tool: "Google", detail: "Read + write events" },
      },
    },
    {
      n: "02",
      title: "Say what you need",
      body: "Voice or text. Talk to ChronoFlow the way you'd ping a teammate — no DSL, no prompt-engineering.",
      bubble: {
        you: "Block 90 minutes tomorrow morning for deep work",
        cf: { action: "Focus block created", tool: "Calendar", detail: "Tue 9:00 – 10:30 AM" },
      },
    },
    {
      n: "03",
      title: "It does it",
      body: "ChronoFlow executes across the right tools and confirms back. No tabs to open. No status to chase.",
      bubble: {
        you: "Email Maya the launch checklist",
        cf: { action: "Draft saved", tool: "Gmail", detail: "To: maya@acme.io  ·  Ready to send" },
      },
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps. No homework."
          subtitle="No new app to live in. No new workflow to learn."
        />

        <div className="relative mt-12 grid gap-5 md:grid-cols-3">
          <ScrollReveal as="div" className="pointer-events-none absolute inset-x-8 top-12 hidden md:block">
            <div className="cf-connector h-px w-full" />
          </ScrollReveal>

          {steps.map((s, i) => (
            <ScrollReveal key={s.n} delay={i * 120}>
              <article className="cf-card-glow relative flex h-full flex-col rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] tracking-widest text-[var(--cf-text-dim)]">
                    {s.n}
                  </span>
                  <span className="cf-chip rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--cf-text-muted)]">
                    step
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[var(--cf-text)]">{s.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-[var(--cf-text-muted)]">
                  {s.body}
                </p>

                <MiniExchange you={s.bubble.you} cf={s.bubble.cf} />
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function MiniExchange({
  you,
  cf,
}: {
  you: string
  cf: { action: string; tool: string; detail: string }
}) {
  return (
    <div className="mt-5 space-y-2 rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--cf-text-dim)]">
          you
        </span>
        <p className="font-mono text-[12.5px] leading-snug text-[var(--cf-text)]">{you}</p>
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[rgba(var(--cf-accent-rgb),1)]">
          cf
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[12.5px] leading-snug text-[var(--cf-text)]">
            {cf.action}{" "}
            <span className="cf-chip-accent ml-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider">
              {cf.tool}
            </span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[11.5px] text-[var(--cf-text-muted)]">
            {cf.detail}
          </p>
        </div>
      </div>
    </div>
  )
}

function Features() {
  const features: Array<{
    icon: React.ReactNode
    title: string
    body: string
    sample?: string
  }> = [
    {
      icon: <Mic className="h-4 w-4" />,
      title: "Voice and text input",
      body: "Talk to ChronoFlow like a teammate. Speak it on the go, type it at your desk — same brain, same model.",
      sample: '"Block 90 mins tomorrow morning for deep work."',
    },
    {
      icon: <Workflow className="h-4 w-4" />,
      title: "Cross-tool execution",
      body: "One sentence, one outcome. ChronoFlow figures out which tool the action belongs in and lands it there.",
      sample: '"File a bug for the login timeout, high priority."',
    },
    {
      icon: <Layers className="h-4 w-4" />,
      title: "Daily briefing",
      body: "Ask what you missed and get the full picture in one read — meetings, mentions, PRs, new tickets.",
      sample: '"What did I miss today?"',
    },
    {
      icon: <Clock className="h-4 w-4" />,
      title: "Smart focus blocks",
      body: "Reserves deep-work time on your real calendar. Detects conflicts. Reschedules when life intrudes.",
      sample: '"Find me 2 hours of focus time before Thursday."',
    },
    {
      icon: <Mail className="h-4 w-4" />,
      title: "Inbox into action",
      body: "Reads incoming threads, drafts replies, and turns asks into tasks where they actually belong.",
      sample: '"Draft a reply to the client about the API delay."',
    },
    {
      icon: <Bell className="h-4 w-4" />,
      title: "Reminders with context",
      body: "Every reminder carries the link — to the PR, the ticket, the thread. No \"find it later.\"",
      sample: '"Remind me to review Jake\'s PR in 2 hours."',
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="Features"
          title="A teammate that ships, not just suggests."
          subtitle="ChronoFlow doesn't summarize your work — it does it."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 60}>
              <article className="cf-card-glow flex h-full flex-col rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)]"
                  style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
                >
                  {f.icon}
                </div>
                <h3 className="mt-4 text-[16px] font-semibold text-[var(--cf-text)]">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--cf-text-muted)]">
                  {f.body}
                </p>
                {f.sample && (
                  <div className="mt-auto pt-4">
                    <div className="rounded-md border border-[var(--cf-border)] bg-[var(--cf-bg)] px-3 py-2 font-mono text-[12px] text-[var(--cf-text-muted)]">
                      <span className="text-[rgba(var(--cf-accent-rgb),1)]">$</span> {f.sample}
                    </div>
                  </div>
                )}
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Examples() {
  const turns: Array<{
    you: string
    action: string
    tool: string
    detail: string
  }> = [
    {
      you: "Schedule a 30 min sync with Sarah Thursday afternoon",
      action: "Calendar event created",
      tool: "Calendar",
      detail: "Thu, 2:00 – 2:30 PM  ·  Sarah Chen invited",
    },
    {
      you: "Create a bug ticket: login timeout on Safari, high priority",
      action: "Ticket opened",
      tool: "Jira",
      detail: "ENG-1284  ·  High  ·  Assigned to you",
    },
    {
      you: "Remind me to review Jake's PR in 2 hours",
      action: "Reminder set",
      tool: "GitHub",
      detail: "4:30 PM today  ·  acme/api#812",
    },
    {
      you: "What did I miss today?",
      action: "Daily summary",
      tool: "Inbox",
      detail: "3 Slack mentions  ·  2 PRs to review  ·  1 new Jira",
    },
    {
      you: "Tell the team standup is moved to 3pm",
      action: "Message sent",
      tool: "Slack",
      detail: "#engineering  ·  12 members notified",
    },
    {
      you: "Draft an email to the client about the API delay",
      action: "Draft saved",
      tool: "Gmail",
      detail: "Subject: Quick update on the API timeline",
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="Real commands"
          title="Talk like you would to a teammate."
          subtitle="No syntax. No /slash commands. Plain English."
        />

        <ScrollReveal delay={80} className="mt-10">
          <div className="cf-terminal overflow-hidden rounded-xl">
            <div className="flex items-center justify-between border-b border-[var(--cf-border)] px-3.5 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="cf-terminal-dot" style={{ background: "#ff5f57" }} />
                <span className="cf-terminal-dot" style={{ background: "#febc2e" }} />
                <span className="cf-terminal-dot" style={{ background: "#28c840" }} />
              </div>
              <span className="font-mono text-[11px] text-[var(--cf-text-dim)]">
                ~/chronoflow · transcript
              </span>
              <div className="w-12" />
            </div>

            <ul className="divide-y divide-[var(--cf-border)]">
              {turns.map((t, i) => (
                <li
                  key={i}
                  className="cf-row grid gap-3 px-4 py-5 sm:grid-cols-[88px_1fr] sm:px-6 sm:py-6"
                >
                  <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-dim)] sm:pt-0.5">
                    {String(i + 1).padStart(2, "0")} · you
                  </div>
                  <div>
                    <p className="font-mono text-[14.5px] leading-snug text-[var(--cf-text)] sm:text-[15.5px]">
                      <span className="text-[rgba(var(--cf-accent-rgb),1)]">$</span> {t.you}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[13px] text-[var(--cf-text-muted)]">
                        → {t.action}
                      </span>
                      <span className="cf-chip-accent rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                        {t.tool}
                      </span>
                      <span className="font-mono text-[12.5px] text-[var(--cf-text-dim)]">
                        {t.detail}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function Integrations() {
  const live = [
    {
      name: "Google Calendar",
      meta: "Events · invites · focus blocks",
      logo: <GoogleCalendarLogo />,
      color: "#1A73E8",
    },
    {
      name: "Gmail",
      meta: "Read · draft · reply · label",
      logo: <GmailLogo />,
      color: "#EA4335",
    },
    {
      name: "GitHub",
      meta: "PRs · issues · reminders",
      logo: <GitHubLogo />,
      color: "#6e7681",
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="Integrations"
          title="Start with the tools you own."
          subtitle="Personal OAuth, scoped to what ChronoFlow needs. No admin permissions, no IT ticket — start using it today."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {live.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 80}>
              <article className="cf-card-glow flex h-full items-start gap-4 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-5">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: `${t.color}14`,
                    border: `1px solid ${t.color}33`,
                    boxShadow: `0 0 22px -10px ${t.color}`,
                  }}
                  aria-hidden
                >
                  {t.logo}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[15px] font-semibold text-[var(--cf-text)]">{t.name}</h3>
                    <span className="cf-chip-accent rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                      Live
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-[var(--cf-text-muted)]">
                    {t.meta}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Roadmap() {
  const upcoming: Array<{
    icon: React.ReactNode
    title: string
    body: string
    eta: string
  }> = [
    {
      icon: <Workflow className="h-4 w-4" />,
      title: "Multi-step workflows",
      body: 'Chain commands together. "Every Friday at 3pm, post the team status to #engineering."',
      eta: "Building",
    },
    {
      icon: <Sparkles className="h-4 w-4" />,
      title: "Background agents",
      body: "Runs while you're away — triages your inbox, prepares meeting briefs, queues morning summaries.",
      eta: "Next",
    },
    {
      icon: <Server className="h-4 w-4" />,
      title: "Open-source core · self-host",
      body: "Run ChronoFlow on your own infra. Verify what touches your data. Stay portable.",
      eta: "Next",
    },
    {
      icon: <Smartphone className="h-4 w-4" />,
      title: "Mobile",
      body: "Voice on the go. Hold-to-talk, hands-free dispatch, push notifications when actions land.",
      eta: "Later",
    },
  ]

  const integrations = [
    { name: "Slack", logo: <SlackLogo /> },
    { name: "Jira", logo: <JiraLogo /> },
    { name: "Linear", logo: <LinearLogo /> },
    { name: "Notion", logo: <NotionLogo /> },
    { name: "Microsoft Teams", logo: <TeamsLogo /> },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="Roadmap"
          title="What's shipping next."
          subtitle="A short, opinionated list. No vapor; only what the team is actively building or has scheduled."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {upcoming.map((f, i) => (
            <ScrollReveal key={f.title} delay={i * 80}>
              <article className="cf-card-glow relative flex h-full gap-4 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-5">
                <div
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)]"
                  style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
                >
                  {f.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[15px] font-semibold text-[var(--cf-text)]">
                      {f.title}
                    </h3>
                    <StatusPill label={f.eta} />
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed text-[var(--cf-text-muted)]">
                    {f.body}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={140}>
          <div className="mt-10 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[rgba(var(--cf-accent-rgb),1)]">
                  Joining soon
                </p>
                <p className="mt-1 text-[14.5px] text-[var(--cf-text-muted)]">
                  More integrations in active development.
                </p>
              </div>
              <ul className="flex flex-wrap items-center gap-2">
                {integrations.map((i) => (
                  <li
                    key={i.name}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3 py-1.5"
                  >
                    <span className="flex h-4 w-4 items-center justify-center" aria-hidden>
                      {i.logo}
                    </span>
                    <span className="font-mono text-[12px] text-[var(--cf-text)]">
                      {i.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatusPill({ label }: { label: string }) {
  // "Building" pulses green-ish accent; "Next" / "Later" stay neutral.
  const isActive = label === "Building"
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={
        isActive
          ? {
              borderColor: "rgba(var(--cf-accent-rgb), 0.4)",
              background: "rgba(var(--cf-accent-rgb), 0.1)",
              color: "rgba(var(--cf-accent-rgb), 1)",
            }
          : {
              borderColor: "var(--cf-border-strong)",
              background: "var(--cf-bg-soft)",
              color: "var(--cf-text-muted)",
            }
      }
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse" : ""}`}
        style={{
          background: isActive
            ? "rgba(var(--cf-accent-rgb), 1)"
            : "var(--cf-text-dim)",
          boxShadow: isActive ? "0 0 8px rgba(var(--cf-accent-rgb), 0.8)" : "none",
        }}
      />
      {label}
    </span>
  )
}

function WhyChronoFlow() {
  const reasons: Array<{ icon: React.ReactNode; title: string; body: React.ReactNode }> = [
    {
      icon: <Wallet className="h-4 w-4" />,
      title: "No credit system.",
      body: "Flat monthly pricing when we launch. Use it as much as you want. No tokens, no surprise bills.",
    },
    {
      icon: <Wrench className="h-4 w-4" />,
      title: "Built for engineers.",
      body: "Not a general-purpose assistant pretending to serve everyone. It speaks GitHub, Jira, and standup.",
    },
    {
      icon: <Lock className="h-4 w-4" />,
      title: "Your data stays yours.",
      body: "Open-source core is on the roadmap, with a self-host option for teams that need it.",
    },
    {
      icon: <Terminal className="h-4 w-4" />,
      title: "Lives where you live.",
      body: (
        <>
          Works with the tools you already use. No walled garden, no &ldquo;just move to our
          app.&rdquo;
        </>
      ),
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading eyebrow="Why ChronoFlow" title="Different on purpose." />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {reasons.map((r, i) => (
            <ScrollReveal key={r.title} delay={i * 80}>
              <div className="cf-card-glow flex h-full gap-4 rounded-xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-5">
                <div
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)]"
                  style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
                >
                  {r.icon}
                </div>
                <div>
                  <h3 className="text-[15.5px] font-semibold text-[var(--cf-text)]">{r.title}</h3>
                  <p className="mt-1 text-[14.5px] leading-relaxed text-[var(--cf-text-muted)]">
                    {r.body}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Manifesto() {
  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
        <ScrollReveal>
          <article
            className="cf-card-glow relative overflow-hidden rounded-2xl border border-[var(--cf-border)] bg-[var(--cf-bg-elev)] p-7 sm:p-10"
          >
            {/* Soft brand wash inside the card */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(var(--cf-accent-rgb), 0.18), transparent 70%)",
                filter: "blur(20px)",
              }}
            />

            <div className="relative flex items-start gap-5">
              <Quote
                className="h-9 w-9 shrink-0 -rotate-180"
                style={{ color: "rgba(var(--cf-accent-rgb), 0.55)" }}
                aria-hidden
              />

              <div className="min-w-0">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[rgba(var(--cf-accent-rgb),1)]">
                  A note from the team
                </p>

                <div className="mt-4 space-y-3 text-balance text-[18px] leading-relaxed text-[var(--cf-text)] sm:text-[19px]">
                  <p>
                    We were tired of forgetting PR reviews because the request was in Slack
                    and the action was in GitHub.
                  </p>
                  <p className="text-[var(--cf-text-muted)]">
                    We were tired of paying for AI tools that <em>summarize</em> our work
                    instead of doing it. Tired of credit meters that punish us for using
                    the product we already paid for.
                  </p>
                  <p>
                    So we&apos;re building the assistant we wanted at our last three jobs —
                    one that actually ships.
                  </p>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <span
                    aria-hidden
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] font-mono text-[11px] font-semibold text-[rgba(var(--cf-accent-rgb),1)]"
                  >
                    cf
                  </span>
                  <div className="font-mono text-[12px]">
                    <p className="text-[var(--cf-text)]">— The ChronoFlow team</p>
                    <p className="text-[var(--cf-text-dim)]">
                      Engineers building for engineers.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </ScrollReveal>
      </div>
    </section>
  )
}

function FinalCTA({ initialCount }: { initialCount: number }) {
  return (
    <section className="relative z-10 overflow-hidden border-t border-[var(--cf-border)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(var(--cf-accent-rgb), 0.18), transparent 60%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <ScrollReveal>
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-[var(--cf-text)] sm:text-4xl">
            Stop losing tasks in <span className="cf-gradient-text inline-block">the noise.</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <WaitlistCountLine initial={initialCount} />
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div className="mx-auto mt-7 max-w-lg text-left">
            <WaitlistForm variant="footer" source="footer-cta" />
            <p className="mt-3 text-center font-mono text-[12px] text-[var(--cf-text-dim)]">
              Free for early adopters. No credit card required.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[12px] text-[var(--cf-text-dim)]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
              Free during beta
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="h-3.5 w-3.5" />
              Invites rolling weekly
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Personal OAuth only
            </span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function WaitlistCountLine({ initial }: { initial: number }) {
  if (initial <= 0) {
    return (
      <p className="mt-3 font-mono text-[13px] text-[var(--cf-text-muted)]">
        Be one of the first engineers on the list.
      </p>
    )
  }
  return (
    <p className="mt-3 font-mono text-[13px] text-[var(--cf-text-muted)]">
      Join{" "}
      <AnimatedCount target={initial} className="text-[var(--cf-text)]" />{" "}
      engineers on the waitlist.
    </p>
  )
}

function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-mono text-[12px] text-[var(--cf-text-muted)]">
            chronoflow · © {new Date().getFullYear()}
          </span>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <FooterLink href="/privacy">Privacy</FooterLink>
          <FooterLink href="/terms">Terms</FooterLink>
        </nav>
      </div>
    </footer>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="font-mono text-[12px] text-[var(--cf-text-dim)] transition hover:text-[var(--cf-text)]"
    >
      {children}
    </a>
  )
}

/* ----------------------------- atoms ----------------------------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-[rgba(var(--cf-accent-rgb),1)]">
      {children}
    </p>
  )
}

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <div className="max-w-2xl">
      <ScrollReveal>
        <Eyebrow>{eyebrow}</Eyebrow>
      </ScrollReveal>
      <ScrollReveal delay={60}>
        <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-[var(--cf-text)] sm:text-4xl">
          {title}
        </h2>
      </ScrollReveal>
      {subtitle && (
        <ScrollReveal delay={120}>
          <p className="mt-3 text-[16.5px] leading-relaxed text-[var(--cf-text-muted)]">
            {subtitle}
          </p>
        </ScrollReveal>
      )}
    </div>
  )
}

function Logo() {
  return (
    <span
      aria-hidden
      className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)]"
      style={{
        boxShadow: "0 0 16px -6px rgba(var(--cf-accent-rgb), 0.6)",
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M8 1.5a6.5 6.5 0 1 0 6.5 6.5"
          stroke="rgba(var(--cf-accent-rgb), 1)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M8 4.5V8l2.5 1.5"
          stroke="var(--cf-text)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}
