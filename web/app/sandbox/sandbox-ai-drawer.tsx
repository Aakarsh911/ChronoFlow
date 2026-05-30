"use client"

import { useEffect, useState } from "react"
import { ArrowUp, Bot, CheckCircle2, Sparkles, X } from "lucide-react"

import { GmailLogo, JiraLogo } from "@/app/waitlist/brand-logos"

type Props = {
  open: boolean
  onClose: () => void
  onPrompt: (prompt: string) => void
}

const SUGGESTIONS = [
  "Create a P1 Jira ticket for the Safari login timeout",
  "Block 90 minutes tomorrow for the rollback review",
  "Summarize unread emails from Alex this week",
]

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; showTools?: boolean }

export function SandboxAiDrawer({ open, onClose, onPrompt }: Props) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [thinking, setThinking] = useState(false)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || thinking) return

    onPrompt(trimmed.slice(0, 80))
    setInput("")
    setMessages((prev) => [...prev, { role: "user", text: trimmed }])
    setThinking(true)

    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Done — this is a demo response. In the real app, ChronoFlow would run actions across your email, calendar, and Jira with your confirmation.",
          showTools: /jira|ticket|reply|email|draft/i.test(trimmed),
        },
      ])
      setThinking(false)
    }, 900)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close AI drawer"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--cf-border)] bg-[var(--cf-bg-elev)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--cf-border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[rgba(var(--cf-accent-rgb),1)]" />
            <span className="font-mono text-sm font-medium text-[var(--cf-text)]">
              Ask ChronoFlow
            </span>
            <span className="rounded-full border border-[var(--cf-border)] px-2 py-0.5 font-mono text-[9px] uppercase text-[var(--cf-text-dim)]">
              demo
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--cf-text-muted)] hover:bg-[var(--cf-bg-soft)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--cf-text-muted)]">
                Try a prompt — responses are canned for the demo, but this is the same drawer
                engineers use in the real app.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3 py-2 text-left text-[12px] text-[var(--cf-text-muted)] transition hover:border-[rgba(var(--cf-accent-rgb),0.4)]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div
                    className="max-w-[90%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-[13px] text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(var(--cf-accent-rgb), 1), rgba(var(--cf-primary-rgb), 1))",
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2.5">
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
                      {msg.text}
                    </p>
                    {msg.showTools && (
                      <>
                        <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-2.5">
                          <div className="flex items-center gap-2">
                            <JiraLogo className="!h-4 !w-4" />
                            <span className="font-mono text-[10px] uppercase text-[var(--cf-text-dim)]">
                              Jira · ticket created
                            </span>
                            <CheckCircle2 className="ml-auto h-3 w-3 text-[rgb(74,222,128)]" />
                          </div>
                          <p className="mt-2 font-mono text-[11px] text-[var(--cf-text)]">
                            ENG-1284 · Login timeout on Safari
                          </p>
                        </div>
                        <div className="rounded-lg border border-[var(--cf-border)] bg-[var(--cf-bg)] p-2.5">
                          <div className="flex items-center gap-2">
                            <GmailLogo className="!h-4 !w-4" />
                            <span className="font-mono text-[10px] uppercase text-[var(--cf-text-dim)]">
                              Gmail · draft ready
                            </span>
                          </div>
                          <p className="mt-2 text-[12px] text-[var(--cf-text-muted)]">
                            Draft reply to Alex — review by Friday EOD.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ),
            )}
            {thinking && (
              <p className="font-mono text-[12px] text-[var(--cf-text-dim)]">Thinking…</p>
            )}
          </div>
        </div>

        <form
          className="flex items-center gap-2 border-t border-[var(--cf-border)] bg-[var(--cf-bg-soft)] p-3"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything — schedule, draft, file a ticket…"
            className="flex-1 rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg)] px-3 py-2 font-mono text-[12px] text-[var(--cf-text)] outline-none focus:border-[rgba(var(--cf-accent-rgb),0.5)]"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-md text-white disabled:opacity-50"
            style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
