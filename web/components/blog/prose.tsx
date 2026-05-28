import type { ReactNode } from "react"
import Link from "next/link"

interface ProseProps {
  children: ReactNode
  className?: string
  id?: string
}

export function H2({ children, id, className = "" }: ProseProps) {
  return (
    <h2
      id={id}
      className={`mt-10 mb-4 text-xl font-semibold tracking-tight text-[var(--cf-text)] scroll-mt-24 ${className}`}
    >
      {children}
    </h2>
  )
}

export function H3({ children, id, className = "" }: ProseProps) {
  return (
    <h3
      id={id}
      className={`mt-7 mb-3 text-base font-semibold text-[var(--cf-text)] scroll-mt-24 ${className}`}
    >
      {children}
    </h3>
  )
}

export function P({ children, className = "" }: ProseProps) {
  return (
    <p className={`mb-5 leading-7 text-[var(--cf-text-muted)] ${className}`}>
      {children}
    </p>
  )
}

export function A({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const isExternal = href.startsWith("http")
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[var(--cf-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
      >
        {children}
      </a>
    )
  }
  return (
    <Link
      href={href}
      className="text-[var(--cf-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
    >
      {children}
    </Link>
  )
}

export function Codeblock({
  children,
  language = "typescript",
}: {
  children: string
  language?: string
}) {
  return (
    <div className="my-6 rounded-lg overflow-hidden border border-[var(--cf-border)]">
      {language && (
        <div className="px-4 py-1.5 bg-[var(--cf-bg-soft)] border-b border-[var(--cf-border)] flex items-center gap-2">
          <span className="text-[11px] font-mono text-[var(--cf-text-dim)] uppercase tracking-wide">
            {language}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 bg-[var(--cf-bg-elev)]">
        <code className={`text-[13px] leading-6 font-mono text-[var(--cf-text)] language-${language}`}>
          {children}
        </code>
      </pre>
    </div>
  )
}

export function Callout({
  children,
  type = "info",
}: {
  children: ReactNode
  type?: "info" | "warning" | "tip"
}) {
  const styles = {
    info: "bg-[var(--cf-accent-soft)] border-[var(--cf-accent)] text-[var(--cf-text)]",
    warning: "bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-950/30 dark:border-amber-600 dark:text-amber-200",
    tip: "bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-600 dark:text-emerald-200",
  }

  return (
    <div className={`my-5 rounded-lg border-l-4 px-4 py-3 text-sm leading-6 ${styles[type]}`}>
      {children}
    </div>
  )
}
