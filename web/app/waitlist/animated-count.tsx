"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  target: number
  durationMs?: number
  className?: string
}

/**
 * Counts up from 0 to `target` once the element enters the viewport.
 * Uses requestAnimationFrame with an easeOutCubic curve. No-op when the
 * user prefers reduced motion — renders the final value instantly.
 */
export function AnimatedCount({ target, durationMs = 1400, className = "" }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const [value, setValue] = useState(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!ref.current) return

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || startedRef.current) return
        startedRef.current = true
        const start = performance.now()
        let raf = 0

        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs)
          // easeOutCubic
          const eased = 1 - Math.pow(1 - t, 3)
          setValue(Math.round(target * eased))
          if (t < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
      },
      { threshold: 0.4 },
    )

    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target, durationMs])

  return (
    <span ref={ref} className={className} aria-live="polite">
      {value.toLocaleString()}
    </span>
  )
}
