"use client"

import Link from "next/link"
import { ArrowRight, MonitorPlay } from "lucide-react"

export function SeeItInAction() {
  return (
    <section
      id="demo"
      className="relative z-10 mx-auto max-w-3xl px-5 pt-10 pb-24 sm:px-8 sm:pt-12 sm:pb-32"
    >
      <div className="overflow-hidden rounded-2xl border border-[var(--cf-border-strong)] bg-[var(--cf-bg-elev)] shadow-[0_24px_80px_-40px_rgba(var(--cf-accent-rgb),0.35)]">
        <div
          className="border-b border-[var(--cf-border)] px-6 py-5 sm:px-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(var(--cf-accent-rgb), 0.08) 0%, transparent 55%)",
          }}
        >
          <div className="flex items-start gap-4">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(var(--cf-accent-rgb),0.35)] bg-[var(--cf-accent-soft)]"
              style={{ color: "rgba(var(--cf-accent-rgb), 1)" }}
            >
              <MonitorPlay className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--cf-text-dim)]">
                See it in action
              </p>
              <h2 className="mt-1 text-balance text-xl font-semibold tracking-tight text-[var(--cf-text)] sm:text-2xl">
                Explore the product with sample data
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--cf-text-muted)]">
                Walk through mail, tasks, calendar, and focus time — the same UI your team
                would use after connecting Gmail, Outlook, and Jira. No signup required.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <ul className="space-y-1.5 font-mono text-[11.5px] text-[var(--cf-text-dim)]">
            <li>Sample inbox · extract tasks from mail</li>
            <li>Task board · focus timer · team scheduling</li>
          </ul>
          <Link
            href="/sandbox"
            className="group inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{
              background:
                "linear-gradient(110deg, rgba(var(--cf-accent-rgb), 1) 0%, rgba(var(--cf-primary-rgb), 1) 100%)",
              boxShadow:
                "0 8px 28px -10px rgba(var(--cf-accent-rgb), 0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Open interactive demo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
