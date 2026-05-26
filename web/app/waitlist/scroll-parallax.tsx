"use client"

import { useEffect } from "react"

/**
 * Updates a `--cf-scroll-y` CSS variable on the document root every animation
 * frame while the user scrolls. CSS in waitlist.css uses that variable to
 * translate the aurora field and depth orbs at different speeds, creating a
 * gentle parallax — no JS positioning, just one var read by transform rules.
 *
 * Respects `prefers-reduced-motion`: when set, the listener never installs.
 */
export function ScrollParallax() {
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const root = document.documentElement
    let ticking = false
    let lastY = window.scrollY

    const onScroll = () => {
      lastY = window.scrollY
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        root.style.setProperty("--cf-scroll-y", `${lastY}px`)
        ticking = false
      })
    }

    root.style.setProperty("--cf-scroll-y", `${lastY}px`)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll)
      root.style.removeProperty("--cf-scroll-y")
    }
  }, [])

  return null
}
