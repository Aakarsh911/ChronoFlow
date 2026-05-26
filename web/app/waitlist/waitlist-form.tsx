"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Check, Loader2 } from "lucide-react"

type Variant = "hero" | "footer"

type Props = {
  variant?: Variant
  source?: string
  onJoined?: (count: number) => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Reads utm_source / utm_campaign from the URL on mount and stores them in
 * sessionStorage so the value survives the user navigating between hero and
 * footer forms or scrolling without remounting. Returns the captured source.
 */
function useUtmSource(): { utmSource: string | null; utmCampaign: string | null } {
  const [state, setState] = useState<{ utmSource: string | null; utmCampaign: string | null }>(
    { utmSource: null, utmCampaign: null },
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const params = new URLSearchParams(window.location.search)
      const fromUrlSource = params.get("utm_source")
      const fromUrlCampaign = params.get("utm_campaign")

      if (fromUrlSource) {
        window.sessionStorage.setItem("cf_utm_source", fromUrlSource)
      }
      if (fromUrlCampaign) {
        window.sessionStorage.setItem("cf_utm_campaign", fromUrlCampaign)
      }

      setState({
        utmSource:
          fromUrlSource ?? window.sessionStorage.getItem("cf_utm_source") ?? null,
        utmCampaign:
          fromUrlCampaign ?? window.sessionStorage.getItem("cf_utm_campaign") ?? null,
      })
    } catch {
      // private mode / blocked storage — no-op
    }
  }, [])

  return state
}

export function WaitlistForm({ variant = "hero", source, onJoined }: Props) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [alreadyOnList, setAlreadyOnList] = useState(false)
  const { utmSource, utmCampaign } = useUtmSource()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("error")
      setMessage("Please enter a valid email address.")
      return
    }

    setStatus("loading")
    setMessage(null)

    // Source priority: explicit prop > utm_source > variant.
    // Campaign is appended when present so we can tell "reddit-saas-launch"
    // apart from "reddit-organic" later in admin.
    const baseSource = source ?? utmSource ?? variant
    const fullSource = utmCampaign ? `${baseSource}/${utmCampaign}` : baseSource

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: fullSource }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.ok) {
        setStatus("error")
        setMessage(data?.error ?? "Something went wrong. Try again.")
        return
      }

      setStatus("success")
      setAlreadyOnList(Boolean(data.alreadyOnList))
      if (typeof data.count === "number") onJoined?.(data.count)
    } catch {
      setStatus("error")
      setMessage("Network error. Check your connection and try again.")
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-lg border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-4 py-3.5 text-sm"
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--cf-accent-soft)] text-[var(--cf-accent)]">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
        <div className="text-left">
          <p className="font-medium text-[var(--cf-text)]">
            {alreadyOnList ? "You're already on the list." : "You're on the list."}
          </p>
          <p className="mt-0.5 text-[var(--cf-text-muted)]">
            We&apos;ll reach out from <span className="font-mono">team@chronoflow.app</span> when your invite is ready.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="w-full"
      aria-label={variant === "hero" ? "Join the waitlist" : "Join the waitlist — final"}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
        <label htmlFor={`waitlist-email-${variant}`} className="sr-only">
          Work email
        </label>
        <input
          id={`waitlist-email-${variant}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          spellCheck={false}
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (status === "error") {
              setStatus("idle")
              setMessage(null)
            }
          }}
          disabled={status === "loading"}
          aria-invalid={status === "error"}
          aria-describedby={message ? `waitlist-msg-${variant}` : undefined}
          className="h-12 flex-1 rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3.5 font-mono text-[15px] text-[var(--cf-text)] placeholder:text-[var(--cf-text-dim)] outline-none transition focus:border-[rgba(var(--cf-accent-rgb),0.6)] focus:ring-2 focus:ring-[rgba(var(--cf-accent-rgb),0.3)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            background:
              "linear-gradient(110deg, rgba(var(--cf-accent-rgb), 1) 0%, rgba(var(--cf-primary-rgb), 1) 100%)",
            boxShadow:
              "0 8px 28px -10px rgba(var(--cf-accent-rgb), 0.7), inset 0 1px 0 rgba(255,255,255,0.18)",
          }}
          className="group inline-flex h-12 items-center justify-center gap-1.5 rounded-md px-5 text-sm font-semibold text-white transition hover:brightness-110 active:brightness-95 disabled:opacity-60 sm:gap-2"
        >
          {status === "loading" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Joining…</span>
            </>
          ) : (
            <>
              <span>Join the Waitlist</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      {status === "error" && message && (
        <p
          id={`waitlist-msg-${variant}`}
          role="alert"
          className="mt-2 text-sm text-[var(--cf-danger)]"
        >
          {message}
        </p>
      )}
    </form>
  )
}
