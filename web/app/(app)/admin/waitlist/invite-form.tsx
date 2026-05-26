"use client"

import { useActionState } from "react"
import { Send } from "lucide-react"
import { inviteAction, type ActionResult } from "./actions"

const initial: ActionResult = { ok: false }

export default function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteAction, initial)

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
      <label htmlFor="invite-email" className="sr-only">
        Email to invite
      </label>
      <input
        id="invite-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        spellCheck={false}
        placeholder="someone@company.com"
        className="h-10 flex-1 rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] px-3 font-mono text-sm text-[var(--cf-text)] placeholder:text-[var(--cf-text-dim)] outline-none transition focus:border-[rgba(var(--cf-accent-rgb),0.6)] focus:ring-2 focus:ring-[rgba(var(--cf-accent-rgb),0.3)]"
      />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] px-4 text-sm font-medium text-[var(--cf-text)] transition hover:border-[rgba(var(--cf-accent-rgb),0.5)] hover:text-[rgba(var(--cf-accent-rgb),1)] disabled:opacity-60"
      >
        <Send className="size-3.5" aria-hidden />
        {pending ? "Inviting…" : "Send invite"}
      </button>
      {state?.message && (
        <p
          role="status"
          className={`mt-1 text-xs sm:ml-3 sm:mt-0 sm:self-center ${
            state.ok ? "text-[rgba(var(--cf-accent-rgb),1)]" : "text-[var(--cf-danger)]"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  )
}
