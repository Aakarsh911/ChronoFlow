"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

export default function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/waitlist" })}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] px-3 py-1.5 text-sm text-[var(--cf-text-muted)] hover:text-[var(--cf-text)] hover:border-[var(--cf-accent)] transition"
      }
    >
      <LogOut className="size-4" aria-hidden />
      Sign out
    </button>
  )
}
