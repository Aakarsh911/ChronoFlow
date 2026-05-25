"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Mic } from "lucide-react"

type Scene = {
  input: string
  action: string
  tool: string
  detail: string
}

const SCENES: Scene[] = [
  {
    input: "Schedule a 30 min sync with Sarah Thursday afternoon",
    action: "Calendar event created",
    tool: "Google Calendar",
    detail: "Thu, 2:00 – 2:30 PM  ·  Sarah Chen invited",
  },
  {
    input: "Open a bug ticket: login times out on Safari, high priority",
    action: "Jira ticket opened",
    tool: "Jira",
    detail: "ENG-1284  ·  High  ·  Assigned to you",
  },
  {
    input: "Remind me to review Jake's PR in 2 hours",
    action: "Reminder set",
    tool: "GitHub",
    detail: "4:30 PM  ·  github.com/acme/api#812",
  },
  {
    input: "What did I miss today?",
    action: "Summary ready",
    tool: "Inbox",
    detail: "3 Slack mentions  ·  2 PRs to review  ·  1 new Jira",
  },
]

export function HeroTerminal() {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [typed, setTyped] = useState("")
  const [phase, setPhase] = useState<"typing" | "thinking" | "result" | "hold">("typing")
  const reducedMotion = useReducedMotion()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scene = SCENES[sceneIdx]

  useEffect(() => {
    if (reducedMotion) {
      setTyped(scene.input)
      setPhase("result")
      return
    }

    const clear = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }

    if (phase === "typing") {
      if (typed.length < scene.input.length) {
        timerRef.current = setTimeout(
          () => setTyped(scene.input.slice(0, typed.length + 1)),
          // Slight jitter so it feels human, not robotic.
          24 + Math.random() * 38,
        )
      } else {
        timerRef.current = setTimeout(() => setPhase("thinking"), 320)
      }
    } else if (phase === "thinking") {
      timerRef.current = setTimeout(() => setPhase("result"), 520)
    } else if (phase === "result") {
      timerRef.current = setTimeout(() => setPhase("hold"), 2200)
    } else if (phase === "hold") {
      timerRef.current = setTimeout(() => {
        setTyped("")
        setPhase("typing")
        setSceneIdx((i) => (i + 1) % SCENES.length)
      }, 700)
    }

    return clear
  }, [phase, typed, scene.input, reducedMotion])

  const showResult = phase === "result" || phase === "hold"

  return (
    <div
      aria-label="ChronoFlow command demo"
      className="cf-terminal cf-terminal-scan w-full rounded-xl"
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-[var(--cf-border)] px-3.5 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="cf-terminal-dot" style={{ background: "#ff5f57" }} />
          <span className="cf-terminal-dot" style={{ background: "#febc2e" }} />
          <span className="cf-terminal-dot" style={{ background: "#28c840" }} />
        </div>
        <div className="font-mono text-[11px] text-[var(--cf-text-dim)]">
          chronoflow — voice + text
        </div>
        <div className="w-12" />
      </div>

      {/* Body */}
      <div className="relative px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] text-[var(--cf-accent)]">
            <Mic className="h-3.5 w-3.5" />
          </div>
          <div className="min-h-[3.25rem] flex-1">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              You said
            </div>
            <p
              className="mt-1 font-mono text-[15px] leading-relaxed text-[var(--cf-text)] sm:text-base"
              aria-live="polite"
            >
              <span>{typed}</span>
              {phase === "typing" && !reducedMotion && <span className="cf-cursor" />}
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-start gap-3">
          <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] font-mono text-[10px] font-semibold text-[var(--cf-accent)]">
            cf
          </div>
          <div className="min-h-[3.25rem] flex-1">
            <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-dim)]">
              ChronoFlow
            </div>

            {!showResult ? (
              <div className="mt-2 flex items-center gap-2 text-[var(--cf-text-dim)]" aria-hidden>
                <ThinkingDots active={phase === "thinking"} />
                <span className="font-mono text-xs">
                  {phase === "thinking" ? "working…" : "listening"}
                </span>
              </div>
            ) : (
              <div className="mt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[15px] text-[var(--cf-text)] sm:text-base">
                    {scene.action}
                  </span>
                  <span className="cf-chip-accent rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider">
                    {scene.tool}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[13px] text-[var(--cf-text-muted)]">
                  {scene.detail}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--cf-border)] px-4 py-2.5 font-mono text-[11px] text-[var(--cf-text-dim)]">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: "rgba(var(--cf-accent-rgb), 1)",
              boxShadow: "0 0 10px rgba(var(--cf-accent-rgb), 0.9)",
            }}
          />
          <span>connected · 3 tools</span>
        </div>
        <SceneDots active={sceneIdx} total={SCENES.length} />
      </div>
    </div>
  )
}

function ThinkingDots({ active }: { active: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-1.5 w-1.5 rounded-full bg-[var(--cf-text-dim)]"
          style={{
            opacity: active ? 0.4 : 0.25,
            animation: active ? `cf-pulse 1.1s ${i * 0.12}s ease-in-out infinite` : "none",
          }}
        />
      ))}
      <style>{`@keyframes cf-pulse { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }`}</style>
    </span>
  )
}

function SceneDots({ active, total }: { active: number; total: number }) {
  const items = useMemo(() => Array.from({ length: total }), [total])
  return (
      <div className="flex items-center gap-1" aria-hidden>
      {items.map((_, i) => (
        <span
          key={i}
          className="h-1 w-4 rounded-full transition-colors"
          style={{
            background:
              i === active ? "rgba(var(--cf-accent-rgb), 1)" : "var(--cf-border-strong)",
            boxShadow:
              i === active ? "0 0 8px rgba(var(--cf-accent-rgb), 0.7)" : "none",
          }}
        />
      ))}
    </div>
  )
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduced(mql.matches)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener?.("change", onChange)
    return () => mql.removeEventListener?.("change", onChange)
  }, [])
  return reduced
}
