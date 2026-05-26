"use client"

import { useEffect, useState } from "react"

import { AnimatedCount } from "./animated-count"

/**
 * Fetches the live waitlist count after hydration so the page can be
 * statically prerendered with readable HTML for crawlers and LLM fetchers.
 */
export function WaitlistCountLine() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/waitlist")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data?.count === "number") {
          setCount(data.count)
        }
      })
      .catch(() => {
        if (!cancelled) setCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (count === null || count <= 0) {
    return (
      <p className="mt-3 font-mono text-[13px] text-[var(--cf-text-muted)]">
        Be one of the first on the list.
      </p>
    )
  }

  return (
    <p className="mt-3 font-mono text-[13px] text-[var(--cf-text-muted)]">
      Join{" "}
      <AnimatedCount target={count} className="text-[var(--cf-text)]" />{" "}
      others on the waitlist.
    </p>
  )
}
