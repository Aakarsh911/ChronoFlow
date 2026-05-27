import type { ReactNode } from "react"

type Props = {
  eyebrow?: string
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, subtitle, actions }: Props) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-[rgba(var(--cf-accent-rgb),1)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-balance text-2xl font-semibold tracking-tight text-[var(--cf-text)] sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-2 text-[15px] leading-relaxed text-[var(--cf-text-muted)]">
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
