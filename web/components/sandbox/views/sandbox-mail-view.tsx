"use client"

import { useMemo, useState } from "react"
import { format, isToday, isThisYear } from "date-fns"
import {
  AlertCircle,
  ArrowLeft,
  Inbox,
  Loader2,
  Mail,
  Paperclip,
  Sparkles,
  Square,
  Star,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MailProviderBadge } from "@/components/mail-provider-badge"
import { useSandbox } from "@/components/sandbox/sandbox-context"
import type { SandboxEmail } from "@/lib/sandbox-data"
import { cn } from "@/lib/utils"

type ProviderFilter = "all" | "gmail" | "outlook"
type StatusFilter = "all" | "unread" | "important"

function formatListTime(dateString: string) {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ""
  if (isToday(date)) return format(date, "HH:mm")
  if (isThisYear(date)) return format(date, "MMM d")
  return format(date, "dd/MM/yy")
}

export function SandboxMailView() {
  const sandbox = useSandbox()
  if (!sandbox) return null

  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [activeEmail, setActiveEmail] = useState<SandboxEmail | null>(null)

  const stats = useMemo(
    () => ({
      total: sandbox.emails.length,
      unread: sandbox.emails.filter((e) => !e.isRead).length,
      important: sandbox.emails.filter((e) => e.importance === "high").length,
    }),
    [sandbox.emails],
  )

  const filtered = sandbox.emails.filter((email) => {
    if (providerFilter !== "all" && email.provider !== providerFilter) return false
    if (statusFilter === "unread" && email.isRead) return false
    if (statusFilter === "important" && email.importance !== "high") return false
    return true
  })

  const handleExtract = async () => {
    if (sandbox.mailExtracted) {
      sandbox.navigate("tasks")
      return
    }
    await sandbox.extractTasksFromMail()
  }

  if (activeEmail) {
    return (
      <div className="cf-mail-shell">
        <div className="border-b border-[rgba(var(--cf-accent-rgb),0.35)] bg-[color-mix(in_oklch,var(--cf-bg-elev)_90%,rgba(var(--cf-accent-rgb),0.08))] px-4 py-3.5 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-[rgba(var(--cf-accent-rgb),1)]">
                Try it in the demo
              </p>
              <p className="mt-1 text-sm text-[var(--cf-text-muted)]">
                You opened a sample thread — now extract action items from mail.
              </p>
            </div>
            <button
              type="button"
              disabled={sandbox.extractingMail}
              onClick={handleExtract}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 font-mono text-[12px] font-medium text-white disabled:opacity-60"
              style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
            >
              {sandbox.extractingMail ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting…
                </>
              ) : sandbox.mailExtracted ? (
                <>
                  <Sparkles className="h-4 w-4" />
                  View extracted tasks
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Extract tasks from mail
                </>
              )}
            </button>
          </div>
        </div>

        <div className="cf-mail-reading-full">
          <div className="cf-mail-reading-toolbar">
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setActiveEmail(null)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Inbox
            </Button>
            <MailProviderBadge provider={activeEmail.provider} />
          </div>
          <div className="cf-mail-reading-header cf-mail-reading-header-full">
            <h2 className="mb-2 line-clamp-2 text-xl font-medium text-[var(--cf-text)]">
              {activeEmail.subject}
            </h2>
            <p className="text-sm text-[var(--cf-text-muted)]">
              {activeEmail.from.name} · {activeEmail.from.address}
            </p>
          </div>
          <div className="cf-mail-reading-body cf-mail-reading-body-full px-5 py-4 text-[15px] leading-relaxed text-[var(--cf-text-muted)]">
            {activeEmail.bodyText ?? activeEmail.bodyPreview}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="cf-mail-shell">
      <div className="border-b border-[rgba(var(--cf-accent-rgb),0.35)] bg-[color-mix(in_oklch,var(--cf-bg-elev)_90%,rgba(var(--cf-accent-rgb),0.08))] px-4 py-3.5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-[rgba(var(--cf-accent-rgb),1)]">
              Try it in the demo
            </p>
            <p className="mt-1 text-sm text-[var(--cf-text-muted)]">
              Open Alex&apos;s unread thread, then extract action items from mail.
            </p>
          </div>
          <button
            type="button"
            disabled={sandbox.extractingMail}
            onClick={handleExtract}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 font-mono text-[12px] font-medium text-white disabled:opacity-60"
            style={{ background: "rgba(var(--cf-accent-rgb), 1)" }}
          >
            {sandbox.extractingMail ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Extracting…
              </>
            ) : sandbox.mailExtracted ? (
              <>
                <Sparkles className="h-4 w-4" />
                View extracted tasks
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Extract tasks from mail
              </>
            )}
          </button>
        </div>
      </div>

      <div className="cf-mail-toolbar px-3 py-2 sm:px-4">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
          <Tabs value={providerFilter} onValueChange={(v) => setProviderFilter(v as ProviderFilter)}>
            <TabsList className="h-8 bg-[var(--cf-bg-soft)]">
              <TabsTrigger value="all" className="h-7 px-3 text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="gmail" className="h-7 px-3 text-xs">
                Gmail
              </TabsTrigger>
              <TabsTrigger value="outlook" className="h-7 px-3 text-xs">
                Outlook
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="h-8 bg-[var(--cf-bg-soft)]">
              <TabsTrigger value="all" className="h-7 px-2.5 text-xs">
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                All
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] px-1.5 text-[10px]">
                  {stats.total}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread" className="h-7 px-2.5 text-xs">
                <Inbox className="mr-1.5 h-3.5 w-3.5" />
                Unread
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] px-1.5 text-[10px]">
                  {stats.unread}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="important" className="h-7 px-2.5 text-xs">
                <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
                Important
                <Badge variant="secondary" className="ml-1.5 h-4 min-w-[1.25rem] px-1.5 text-[10px]">
                  {stats.important}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="cf-gmail-list cf-mail-list-scroll">
        {filtered.map((email) => (
          <button
            key={email.id}
            type="button"
            onClick={() => setActiveEmail(email)}
            className={cn("cf-gmail-row", email.isRead ? "is-read" : "is-unread")}
          >
            <span className="cf-gmail-check" aria-hidden>
              <Square className="h-4 w-4 text-[var(--cf-text-dim)]" />
            </span>
            <span className="cf-gmail-star" aria-hidden>
              <Star
                className={cn(
                  "h-4 w-4",
                  email.isStarred ? "fill-amber-400 text-amber-400" : "text-[var(--cf-text-dim)]",
                )}
              />
            </span>
            <span className="cf-gmail-sender">{email.from.name || email.from.address}</span>
            <span className="cf-gmail-subject-line">
              <span className="cf-gmail-subject">{email.subject || "(No subject)"}</span>
              <span className="cf-gmail-sep"> — </span>
              <span className="cf-gmail-snippet">{email.bodyPreview}</span>
              {email.hasAttachments && (
                <Paperclip className="ml-1.5 inline h-3 w-3 shrink-0 text-[var(--cf-text-dim)]" />
              )}
            </span>
            <span className="cf-gmail-time">{formatListTime(email.receivedDateTime)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
