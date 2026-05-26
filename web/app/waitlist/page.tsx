import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Inbox,
  Layers,
  Link2,
  Lock,
  MessageSquare,
  Server,
  Shield,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react"

import { AnimatedCount } from "./animated-count"
import {
  GitHubLogo,
  GmailLogo,
  GoogleCalendarLogo,
  JiraLogo,
  MicrosoftLogo,
  OutlookLogo,
  SlackLogo,
} from "./brand-logos"
import {
  AnalyticsMock,
  AskMock,
  CalendarMock,
  DashboardMock,
  FocusTimeMock,
  TaskExtractionMock,
  TeamSchedulingMock,
  UnifiedMailMock,
} from "./product-mocks"
import { ProblemScroll } from "./problem-scroll"
import { ScrollParallax } from "./scroll-parallax"
import { ScrollReveal } from "./scroll-reveal"
import { ThemeToggle } from "./theme-toggle"
import { TrackPageView } from "./track-pageview"
import { WaitlistForm } from "./waitlist-form"
import { waitlistCount } from "@/lib/access-list"

export const dynamic = "force-dynamic"

async function getWaitlistCount(): Promise<number> {
  try {
    return await waitlistCount()
  } catch {
    return 0
  }
}

export default async function WaitlistPage() {
  const initialCount = await getWaitlistCount()

  return (
    <main className="cf-parallax-host relative overflow-x-clip">
      {/* Global aurora field — kept behind everything, masked at the top.
       * Translated by --cf-scroll-y via .cf-parallax-host rules in CSS. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1100px]" aria-hidden>
        <div className="cf-aurora-field absolute inset-0">
          <div className="cf-aurora cf-aurora-a" />
          <div className="cf-aurora cf-aurora-b" />
          <div className="cf-aurora cf-aurora-c" />
        </div>
        <div className="absolute inset-0 cf-glow" />
        <div className="absolute inset-0 cf-grid" />
      </div>

      {/* Depth orbs — slow-drifting parallax blobs further down the page so
       * the background motion doesn't stop at the hero. Positioned in absolute
       * page coordinates; translation is driven by --cf-scroll-y in CSS. */}
      <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden" aria-hidden>
        <div className="cf-depth-orb cf-depth-orb-1" />
        <div className="cf-depth-orb cf-depth-orb-2" />
        <div className="cf-depth-orb cf-depth-orb-3" />
      </div>

      <ScrollParallax />
      <TrackPageView path="/waitlist" />
      <SiteHeader />
      <Hero />
      <ProductPreview />
      <ProblemScroll />
      <HowItWorks />
      <Features />
      <Integrations />
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
            href="#join"
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
      id="hero"
      className="relative z-10 mx-auto max-w-4xl px-5 pb-12 pt-10 text-center sm:px-8 sm:pb-16 sm:pt-16"
    >
      <ScrollReveal>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-muted)]">
          <Sparkles className="h-3 w-3 text-[rgba(var(--cf-accent-rgb),1)]" />
          <span>Private beta · invites rolling weekly</span>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={60}>
        <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--cf-text)] sm:text-5xl lg:text-[60px]">
          Tasks don&apos;t die because you&apos;re lazy.{" "}
          <span className="cf-gradient-text inline-block">
            They die between your tools.
          </span>
        </h1>
      </ScrollReveal>

      <ScrollReveal delay={120}>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-[17px] leading-relaxed text-[var(--cf-text-muted)] sm:text-lg">
          ChronoFlow is the unified workspace for{" "}
          <span className="text-[var(--cf-text)]">software engineers</span> buried in
          Slack, Gmail, Jira, and Calendar. AI pulls action items out of your inbox
          automatically. Team scheduling and focus blocks without the back-and-forth.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={180}>
        <div id="join" className="mx-auto mt-8 max-w-lg">
          <WaitlistForm variant="hero" source="hero" />
          <p className="mt-3 font-mono text-[12px] text-[var(--cf-text-dim)]">
            Free during beta. Uses your own OAuth. No subscriptions required.
          </p>
        </div>
      </ScrollReveal>
    </section>
  )
}

function ProductPreview() {
  return (
    <section className="relative z-10 mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
      <ScrollReveal delay={120}>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-3xl"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(var(--cf-accent-rgb), 0.18), transparent 60%)",
            }}
          />
          <DashboardMock />
        </div>
      </ScrollReveal>
    </section>
  )
}

function HowItWorks() {
  const steps: Array<{ n: string; title: string; body: string; icon: React.ReactNode }> = [
    {
      n: "01",
      title: "Connect your accounts",
      body: "One-click OAuth for Google, Microsoft, and Jira. No admin permissions, no IT ticket. Your data goes directly from each provider to ChronoFlow.",
      icon: <Link2 className="h-4 w-4" />,
    },
    {
      n: "02",
      title: "Everything syncs",
      body: "Calendar events, emails, tasks, team messages. Incremental sync via Google syncTokens and Microsoft deltaLinks keeps everything fast and current.",
      icon: <Workflow className="h-4 w-4" />,
    },
    {
      n: "03",
      title: "AI extracts tasks",
      body: "Gemini reads your inbox and Teams messages in batches and pulls out action items with priority and due dates. Newsletters and noise get filtered out.",
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      n: "04",
      title: "See your whole day",
      body: "One view for calendar, email, tasks, and focus time. Schedule deep work, find time with your team, track productivity over time.",
      icon: <Layers className="h-4 w-4" />,
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps. No rip-and-replace."
          subtitle="Use the tools you already pay for. ChronoFlow is the workspace that ties them together."
        />

        <div className="relative mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <ScrollReveal key={s.n} delay={i * 100}>
              <article
                data-step={s.n}
                className="cf-step-card relative flex h-full flex-col rounded-xl border p-5 pt-6"
              >
                <div className="relative z-[1] flex items-center justify-between">
                  <span className="cf-step-number">Step {s.n}</span>
                  <span className="cf-step-icon">{s.icon}</span>
                </div>
                <h3 className="relative z-[1] mt-4 text-lg font-semibold text-[var(--cf-text)]">
                  {s.title}
                </h3>
                <p className="relative z-[1] mt-1.5 text-[14.5px] leading-relaxed text-[var(--cf-text-muted)]">
                  {s.body}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  const features: Array<{
    eyebrow: string
    title: string
    body: string
    bullets: string[]
    mock: React.ReactNode
    icon: React.ReactNode
  }> = [
    {
      eyebrow: "AI task extraction · the headline feature",
      title: "Stop hand-scanning your inbox for action items.",
      body:
        "ChronoFlow reads your Gmail, Outlook, and Teams messages in batches and uses Gemini to pull out the things you actually have to do. Newsletters, marketing, and CI notifications get filtered out. Confidence scoring means only real action items make it through to your task board — with priority and due date inferred from the message itself.",
      bullets: [
        "Batched LLM calls — no rate-limit failures on a 200-email morning",
        "Filters out newsletters, promotions, GitHub notification noise",
        "Priority and due date inferred from the message itself",
        "Source link back to the original thread on every task",
      ],
      mock: <TaskExtractionMock />,
      icon: <Sparkles className="h-4 w-4" />,
    },
    {
      eyebrow: "Ask ChronoFlow",
      title: "Type what you need. It happens across your tools.",
      body:
        "When clicking through the UI isn't the fastest way, just type. \"Draft a reply telling Sarah Thursday at 2 works.\" \"Create a P1 Jira ticket for the login timeout.\" \"What did I miss today?\" ChronoFlow runs the action in the right tool with the right context — pulling the email thread, the assignee, or the ticket history so you don't have to. Every write action confirms before it goes out.",
      bullets: [
        "Drafts email replies using the original thread for context",
        "Creates Jira tickets with priority and assignee inferred",
        "Summarizes unread mentions, new assignments, pending reviews",
        "Confirms before sending or writing — you stay in control",
      ],
      mock: <AskMock />,
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      eyebrow: "Team scheduling",
      title: "Find time without the back-and-forth.",
      body:
        "Pull up your teammates' availability across Microsoft Teams, find a common open slot in seconds, and create the meeting in place. No more \"what time works for everyone\" email chains. Free/busy only — nobody's actual events get exposed.",
      bullets: [
        "Multi-person availability across the week",
        "Common-slot detection across selected teammates",
        "Create the meeting from the same UI",
      ],
      mock: <TeamSchedulingMock />,
      icon: <Users className="h-4 w-4" />,
    },
    {
      eyebrow: "Smart calendar",
      title: "A calendar that knows what's movable.",
      body:
        "Google Calendar and Outlook synced via incremental sync — changes show up in seconds. Events are classified as meetings, focus blocks, tasks, or personal, so the system knows what it can move and what it can't. When conflicts appear, your protected time stays protected.",
      bullets: [
        "Google + Outlook calendars merged into one view",
        "Event types tell the scheduler what's movable",
        "Focus blocks survive the daily reshuffle",
      ],
      mock: <CalendarMock />,
      icon: <CalendarIcon className="h-4 w-4" />,
    },
    {
      eyebrow: "Unified inbox",
      title: "Gmail and Outlook, side by side.",
      body:
        "Read, star, and triage your email without bouncing between apps. The AI extraction layer runs on top of this view — when a message has an action item, the task lands on your board with a link back to the original thread.",
      bullets: [
        "Gmail + Outlook in a single inbox view",
        "Star, flag, and track without switching apps",
        "Source labels keep every task traceable",
      ],
      mock: <UnifiedMailMock />,
      icon: <Inbox className="h-4 w-4" />,
    },
    {
      eyebrow: "Focus time",
      title: "Deep work, on the clock.",
      body:
        "Preset durations from 25 minutes to 4 hours, or custom. Creates a calendar block marked busy so meetings can't sneak in. Live timer, do-not-disturb signaling, and a session history so you can see your focus patterns over time.",
      bullets: [
        "Calendar-backed blocks visible to your team",
        "Live timer with running session and history",
        "Streaks and weekly totals to track the habit",
      ],
      mock: <FocusTimeMock />,
      icon: <Clock className="h-4 w-4" />,
    },
    {
      eyebrow: "Analytics",
      title: "See where your time actually goes.",
      body:
        "Weekly trends, focus vs. meeting hours, task completion rates, peak productivity windows. AI-generated insights surface patterns you'd never spot yourself — like which days of the week you actually ship.",
      bullets: [
        "Focus hours vs. meeting hours, week over week",
        "Task completion rates by source and priority",
        "AI insights with actionable recommendations",
      ],
      mock: <AnalyticsMock />,
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="What's shipped"
          title="From inbox to ticket to calendar — without leaving the workspace."
          subtitle="The AI that reads your inbox is the centerpiece. Everything else exists because action items alone don't help if your calendar, tasks, and team chat live in different worlds."
        />

        <div className="mt-14 space-y-20 sm:space-y-24">
          {features.map((f, i) => (
            <FeatureRow key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureRow({
  feature,
  index,
}: {
  feature: {
    eyebrow: string
    title: string
    body: string
    bullets: string[]
    mock: React.ReactNode
    icon: React.ReactNode
  }
  index: number
}) {
  // Alternate sides on desktop. Mock always renders below copy on mobile.
  const reversed = index % 2 === 1

  return (
    <ScrollReveal>
      <div
        className={`grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14 ${
          reversed ? "lg:[&>div:first-child]:order-2" : ""
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)]"
              style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
            >
              {feature.icon}
            </span>
            <Eyebrow>{feature.eyebrow}</Eyebrow>
          </div>
          <h3 className="mt-4 text-balance text-2xl font-semibold tracking-tight text-[var(--cf-text)] sm:text-3xl">
            {feature.title}
          </h3>
          <p className="mt-4 text-[16px] leading-relaxed text-[var(--cf-text-muted)]">
            {feature.body}
          </p>
          <ul className="mt-5 space-y-2">
            {feature.bullets.map((b) => (
              <li
                key={b}
                className="flex items-start gap-2.5 text-[14.5px] text-[var(--cf-text)]"
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0"
                  style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
                  aria-hidden
                />
                <span className="text-[var(--cf-text-muted)]">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(var(--cf-accent-rgb), 0.10), transparent 70%)",
            }}
          />
          {feature.mock}
        </div>
      </div>
    </ScrollReveal>
  )
}

function Integrations() {
  const live = [
    {
      name: "Google",
      meta: "Calendar · Gmail · Drive",
      logo: <GoogleCalendarLogo />,
      sub: <GmailLogo className="!h-3 !w-3" />,
      color: "#1A73E8",
      status: "Live",
    },
    {
      name: "Microsoft",
      meta: "Outlook · Teams · Calendar",
      logo: <MicrosoftLogo />,
      sub: <OutlookLogo className="!h-3 !w-3" />,
      color: "#0078D4",
      status: "Live",
    },
    {
      name: "Jira",
      meta: "Issues · sprints · sync",
      logo: <JiraLogo />,
      sub: null,
      color: "#2684FF",
      status: "Live",
    },
    {
      name: "GitHub",
      meta: "PRs · issues · reminders",
      logo: <GitHubLogo />,
      sub: null,
      color: "#6e7681",
      status: "Live",
    },
    {
      name: "Slack",
      meta: "Channels · DMs · mentions",
      logo: <SlackLogo dim />,
      sub: null,
      color: "#4A154B",
      status: "Coming soon",
    },
    {
      name: "Self-hosted",
      meta: "Run it on your own infra",
      logo: <ServerIcon />,
      sub: null,
      color: "#64748b",
      status: "On roadmap",
    },
  ]

  return (
    <section className="relative z-10 border-t border-[var(--cf-border)]">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="Integrations"
          title="Connect what you already use."
          subtitle="Personal OAuth, scoped to what ChronoFlow needs. Your data goes directly from each provider — no middleman, no broker, no syncing through us."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {live.map((t, i) => (
            <ScrollReveal key={t.name} delay={i * 60}>
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
                    <h3 className="text-[15px] font-semibold text-[var(--cf-text)]">
                      {t.name}
                    </h3>
                    <StatusPill label={t.status} />
                  </div>
                  <p className="mt-1 font-mono text-[12px] text-[var(--cf-text-muted)]">
                    {t.meta}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={300}>
          <div className="mt-10 flex flex-col gap-4 rounded-xl border border-dashed border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-5 sm:flex-row sm:items-center sm:gap-6">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)]"
              style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
            >
              <Shield className="h-4 w-4" />
            </span>
            <p className="text-[14px] leading-relaxed text-[var(--cf-text-muted)]">
              <span className="font-semibold text-[var(--cf-text)]">
                Your data, your stack.
              </span>{" "}
              Tokens are stored encrypted, scoped to the read/write actions ChronoFlow
              needs. A self-hosted deployment is on the roadmap for teams that need data
              to stay on their own infrastructure.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

function StatusPill({ label }: { label: string }) {
  const tone =
    label === "Live"
      ? {
          borderColor: "rgba(var(--cf-accent-rgb), 0.4)",
          background: "rgba(var(--cf-accent-rgb), 0.1)",
          color: "rgba(var(--cf-accent-rgb), 1)",
          dot: "rgba(var(--cf-accent-rgb), 1)",
          pulse: true,
        }
      : {
          borderColor: "var(--cf-border-strong)",
          background: "var(--cf-bg-soft)",
          color: "var(--cf-text-muted)",
          dot: "var(--cf-text-dim)",
          pulse: false,
        }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{
        borderColor: tone.borderColor,
        background: tone.background,
        color: tone.color,
      }}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tone.pulse ? "animate-pulse" : ""}`}
        style={{
          background: tone.dot,
          boxShadow: tone.pulse
            ? "0 0 8px rgba(var(--cf-accent-rgb), 0.8)"
            : "none",
        }}
      />
      {label}
    </span>
  )
}

function ServerIcon() {
  return (
    <Server
      className="h-5 w-5"
      style={{ color: "var(--cf-text-muted)" }}
      aria-hidden
    />
  )
}

function FinalCTA({ initialCount }: { initialCount: number }) {
  return (
    <section
      id="join-bottom"
      className="relative z-10 overflow-hidden border-t border-[var(--cf-border)]"
    >
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
            Join the beta.{" "}
            <span className="cf-gradient-text inline-block">It&apos;s free.</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={80}>
          <WaitlistCountLine initial={initialCount} />
        </ScrollReveal>

        <ScrollReveal delay={140}>
          <div className="mx-auto mt-7 max-w-lg text-left">
            <WaitlistForm variant="footer" source="footer-cta" />
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[12px] text-[var(--cf-text-dim)]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[rgba(var(--cf-accent-rgb),1)]" />
              No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" />
              No Claude subscription
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              No vendor lock-in
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
        Be one of the first on the list.
      </p>
    )
  }
  return (
    <p className="mt-3 font-mono text-[13px] text-[var(--cf-text-muted)]">
      Join{" "}
      <AnimatedCount target={initial} className="text-[var(--cf-text)]" />{" "}
      others on the waitlist.
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
