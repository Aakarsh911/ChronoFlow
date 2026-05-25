"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  children: React.ReactNode
  delay?: number
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}

export function ScrollReveal({ children, delay = 0, className = "", as = "div" }: Props) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Respect users that don't want motion.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay) {
            const t = setTimeout(() => setVisible(true), delay)
            return () => clearTimeout(t)
          }
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [delay])

  const Tag = as as unknown as "div"
  return (
    <Tag
      // @ts-expect-error – ref typing across HTML element variants
      ref={ref}
      className={`cf-reveal ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </Tag>
  )
}
