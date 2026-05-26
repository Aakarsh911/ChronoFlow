"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "dark" | "light"

/**
 * Reads/writes the `data-cf-theme` attribute on <html>. The initial value
 * is set by an inline script in the layout (see layout.tsx) so we don't
 * flash the wrong theme on first paint. This component only listens and
 * toggles after hydration — no SSR/CSR mismatch.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null)

  useEffect(() => {
    // Light is the default; only "dark" is ever explicitly set.
    const attr = document.documentElement.getAttribute("data-cf-theme")
    setTheme(attr === "dark" ? "dark" : "light")
  }, [])

  const toggle = () => {
    const next: Theme = theme === "light" ? "dark" : "light"
    setTheme(next)
    if (next === "dark") {
      document.documentElement.setAttribute("data-cf-theme", "dark")
    } else {
      document.documentElement.removeAttribute("data-cf-theme")
    }
    try {
      localStorage.setItem("cf-theme", next)
    } catch {
      /* ignored */
    }
  }

  // Render a placeholder with matching dimensions before hydration to avoid
  // layout shift and to keep the markup stable for screen readers.
  const label = theme === "light" ? "Switch to dark mode" : "Switch to light mode"

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--cf-border-strong)] bg-[var(--cf-bg-soft)] text-[var(--cf-text-muted)] transition hover:text-[var(--cf-text)] hover:border-[rgba(var(--cf-accent-rgb),0.4)] ${className}`}
    >
      {theme === "light" ? (
        <Moon className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <Sun className="h-3.5 w-3.5" aria-hidden />
      )}
    </button>
  )
}
