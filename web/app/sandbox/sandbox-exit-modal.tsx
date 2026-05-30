"use client"

import { X } from "lucide-react"

import { WaitlistForm } from "@/app/waitlist/waitlist-form"

type Props = {
  open: boolean
  onClose: () => void
  onJoin: () => void
}

export function SandboxExitModal({ open, onClose, onJoin }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/55"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-labelledby="exit-modal-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-[var(--cf-text-muted)] hover:bg-[var(--cf-bg-soft)]"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="exit-modal-title" className="text-xl font-semibold text-[var(--cf-text)]">
          Before you go — want early access?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--cf-text-muted)]">
          You just explored a demo built for software engineering teams. Join the waitlist
          and we&apos;ll invite you when the next beta batch opens.
        </p>

        <div className="mt-5" onFocus={onJoin}>
          <WaitlistForm
            variant="hero"
            source="sandbox-exit"
            onJoined={() => onJoin()}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center font-mono text-[11px] text-[var(--cf-text-dim)] hover:text-[var(--cf-text-muted)]"
        >
          Continue exploring the demo
        </button>
      </div>
    </div>
  )
}
